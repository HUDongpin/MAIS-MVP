'use client';

/* ============================================================================
   DivisionLab — an interactive "bench" for whole-number division, taught as the
   INVERSE of multiplication through the EQUAL-GROUPS / ARRAY model.

   Multiplication builds a rectangle from its two sides (a × b = area).
   Division starts from the total (the dividend a) and one side (the divisor b)
   and finds the other side — the quotient — with anything left over becoming
   the REMAINDER.  A student sees, in one picture, the central fact of division:

        a  =  b × q  +  r          (0 ≤ r < b)

   q full rows of b make a clean rectangle; the r leftover squares sit apart as
   the remainder.  Reconstruct with × and you are back to the dividend — division
   undoes multiplication.

   Built for MAIS (math AI system, www.mais.ac), K-12 (grades ~3–5;
   CCSS 3.OA.A.2 interpret whole-number quotients / two meanings of division,
   3.OA.B.6 division as an unknown-factor problem, 4.NBT.B.6 & 4.OA.A.3
   quotients with remainders).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   one carmine accent for the mathematical object, dials that unlock one per
   lesson step, predict-then-check questions, and a calibration challenge with
   a live match meter.

   The signature centerpiece is the QUOTIENT-AND-REMAINDER array (the division
   analogue of the multiplication "break-apart", the ellipse "string" or the
   line "slope triangle"): the total splits into q equal groups plus r leftovers,
   and the running identity a = b × q + r stays true for every dial setting.

   A SHARING ⇄ GROUPING toggle shows the same picture read two ways — the two
   meanings of division every K-12 curriculum must teach (partitive vs.
   quotative).  The quotient q is the same number either way; only the story
   (and which dimension is "a group") changes.

   Division by zero is impossible on purpose: the divisor dial starts at 1, so
   the model never evaluates a ÷ 0.  "You cannot divide by zero" is taught as an
   idea, never produced as a NaN.

   The calibration capstone is a CONSTRUCTION goal (not a curve match): build a
   division whose quotient equals a target, with no remainder.  Because many
   dividends share a quotient (4 = 8÷2 = 12÷3 = 16÷4 …), this quietly teaches
   division facts and the unknown-factor view.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DivisionLab.jsx
     2. Import and render it:
          import DivisionLab from './DivisionLab';
          export default function Page() { return <DivisionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (a, b, view, step).
     MODEL  — the math (quotient, remainder) is pure; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Ranges. The dividend runs 1..24 and the divisor 1..8, so every quotient and
   remainder is a small, clean whole number, and the array always fits the stage
   (it is auto-scaled each frame). The divisor MIN is 1 — never 0 — so the model
   can never divide by zero.
   ------------------------------------------------------------------------- */
const AMAX = 24; // dividend  (total number of squares)
const BMAX = 8; //  divisor   (group size / number of groups)

const PARAMS = [
  { key: 'a', label: 'a', min: 1, max: AMAX, step: 1, unlock: 1, role: 'dividend · the total being split' },
  { key: 'b', label: 'b', min: 1, max: BMAX, step: 1, unlock: 2, role: 'divisor · how you split it' },
];
const START = { a: 12, b: 3 }; // 12 ÷ 3 = 4, no remainder — a clean opening

// Named step indices (0-based) so the renderer and effects stay readable.
const MEET_STEP = 0;
const DIVIDEND_STEP = 1;
const DIVISOR_STEP = 2;
const QUOTIENT_STEP = 3;
const REMAINDER_STEP = 4;
const INVERSE_STEP = 5;
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   MODEL — pure whole-number arithmetic. Every quantity is an exact integer
   (no floating-point error), which is exactly what a K-12 lab must guarantee.
   quotient = ⌊a / b⌋,  remainder = a − b·quotient,  and always a = b·q + r with
   0 ≤ r < b.
   ------------------------------------------------------------------------- */
const quotientOf = (a, b) => Math.floor(a / b);
const remainderOf = (a, b) => a - b * Math.floor(a / b);

/* ---------------------------------------------------------------------------
   Calibration — a CONSTRUCTION goal (reach a target quotient, no remainder),
   not a curve match. Meter is a linear closeness of a/b to the target quotient;
   CALIBRATED only on an EXACT whole-quotient hit (r = 0 and q = target), i.e.
   a = target × b — the unknown-factor view of division.
   ------------------------------------------------------------------------- */
const TARGET_QUOTIENTS = [2, 3, 4, 5, 6];
const quotientPercent = (a, b, Q) => Math.max(0, Math.min(100, 100 * (1 - Math.abs(a / b - Q) / Q)));
const isCalibrated = (a, b, Q) => remainderOf(a, b) === 0 && quotientOf(a, b) === Q;

function makeTarget(prev) {
  let Q;
  do {
    Q = TARGET_QUOTIENTS[Math.floor(Math.random() * TARGET_QUOTIENTS.length)];
  } while (prev && Q === prev);
  return Q;
}

// Every exact division equal to Q within range (dividend ≤ AMAX, divisor ≤ BMAX)
// — shown on success so the student sees "many dividends, one quotient".
function quotientFamily(Q) {
  const out = [];
  for (let b = 1; b <= BMAX; b++) {
    const a = Q * b;
    if (a >= 1 && a <= AMAX) out.push([a, b]);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Lesson. One idea per step; the dial unlocks with the step; the reveal lives
   in `feedback` (shown after answering); distractors are real student
   misconceptions (subtract-instead-of-divide, remainder ≥ divisor, forgetting
   the inverse). Next is gated on ANSWERED, not on CORRECT.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet division',
    body:
      'Division splits a total into equal groups. We picture a ÷ b with unit squares: take a squares ' +
      'and split them into equal groups. Right now it is 12 ÷ 3 — twelve squares split into three ' +
      'equal groups of four. The answer, called the quotient, is how big each group is: 4.',
    q: 'What does 12 ÷ 3 mean?',
    choices: [
      'Split 12 into 3 equal groups — 4 in each group',
      '12 take away 3, which is 9',
      '12 and 3 placed side by side',
    ],
    answer: 0,
    feedback:
      '12 ÷ 3 splits 12 into 3 equal groups of 4 (because 3 × 4 = 12). Subtracting (12 − 3 = 9) is a ' +
      'different operation — dividing shares the total out into equal groups.',
  },
  {
    title: 'a — the dividend',
    body:
      'The a dial is live. a is the DIVIDEND — the total number of squares you start with, the amount ' +
      'to be split. Change a and the pile of squares grows or shrinks. It is the number written under ' +
      'the division bar, or to the left of the ÷ sign.',
    q: 'In 20 ÷ 4, which number is the dividend — the amount being split?',
    choices: ['20 — the total being split', '4 — the number of groups', '5 — the answer'],
    answer: 0,
    feedback:
      'The dividend is 20, the total we split. The 4 is the divisor (it tells us how to split), and 5 ' +
      'is the quotient (the answer). Dividend ÷ divisor = quotient.',
  },
  {
    title: 'b — the divisor',
    body:
      'Now the b dial unlocks. b is the DIVISOR — it tells you how to split the total. There are two ' +
      'ways to read it, and they give the same answer. SHARING: split into b equal groups, how many ' +
      'in each? GROUPING: make groups of b, how many groups? Use the Sharing ⇄ Grouping button to ' +
      'switch between the two views of the same picture.',
    q: 'Share 15 squares into 3 equal groups. How many are in each group?',
    choices: ['5 — because 3 × 5 = 15', '45 — three fifteens', '12 — 15 minus 3'],
    answer: 0,
    feedback:
      '15 ÷ 3 = 5: each of the 3 groups gets 5, because 3 × 5 = 15. Notice the question "3 groups of ' +
      'how many?" is answered by the multiplication fact — division is really asking for a missing factor.',
  },
  {
    title: 'The quotient',
    body:
      'The QUOTIENT is the answer — the size of each group (sharing) or the number of groups ' +
      '(grouping). Press "Deal the squares" to hand them out one at a time and watch the equal groups ' +
      'build. Whichever view you choose, the quotient is the same number.',
    q: 'How many groups of 4 can you make from 12 squares?',
    choices: ['3 — because 4 + 4 + 4 = 12', '8 — 12 minus 4', '48 — 12 times 4'],
    answer: 0,
    feedback:
      '12 ÷ 4 = 3: three groups of 4 use up all 12 (4 + 4 + 4 = 12). "How many groups of 4?" and "how ' +
      'much in each of 4 groups?" both give the quotient — the two meanings of the same division.',
  },
  {
    title: 'Remainders',
    body:
      'Numbers do not always split evenly. When they do not, the squares that cannot complete a group ' +
      'are the REMAINDER, shown in carmine. The full groups make a clean rectangle; the leftovers sit ' +
      'apart. The key identity, true for every setting, is a = b × q + r — and the remainder is ' +
      'ALWAYS smaller than the divisor (if it reached the divisor, you could make one more group).',
    q: 'Divide 14 into groups of 4. Three groups use 12; four would need 16. What is 14 ÷ 4?',
    choices: ['3 remainder 2', '3 remainder 4', '4 remainder 2'],
    answer: 0,
    feedback:
      '14 ÷ 4 = 3 R 2:  4 × 3 = 12, and 14 − 12 = 2 left over. It cannot be "3 R 4", because a remainder ' +
      'of 4 would make one more group of 4. The remainder is always less than the divisor: 0 ≤ r < b.',
  },
  {
    title: 'Division undoes multiplication',
    body:
      'Division and multiplication are inverses. a ÷ b = q means exactly q × b = a — so every division ' +
      'has a matching multiplication (its fact family), and you can CHECK a division by multiplying back ' +
      'and adding the remainder: b × q + r = a. Two special facts: any number ÷ 1 is itself, and a ' +
      'number ÷ itself is 1. And you can never divide by zero — no number of empty groups ever ' +
      'accounts for the total.',
    q: 'You know 6 × 7 = 42. So 42 ÷ 6 = ?',
    choices: ['7 — division undoes multiplication', '8', '36 — 42 minus 6'],
    answer: 0,
    feedback:
      '42 ÷ 6 = 7, because 6 × 7 = 42. The fact family ties them together: 6 × 7 = 42, 7 × 6 = 42, ' +
      '42 ÷ 6 = 7, and 42 ÷ 7 = 6. Knowing your times tables gives you the division facts for free.',
  },
  {
    title: 'Calibration challenge',
    body:
      'Final challenge. You are given a target quotient. Build a division that lands on it EXACTLY — no ' +
      'remainder — by tuning the dividend a and divisor b. That means making a a multiple of b whose ' +
      'quotient is the target. Many dividends work; any exact one calibrates. Press "New target" for a ' +
      'fresh one.',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   The one-line relation shown under the big equation, matched to the step.
   ------------------------------------------------------------------------- */
function subEquation(step, a, b, view) {
  const q = quotientOf(a, b);
  const r = remainderOf(a, b);
  const groupsAreRows = view === 'group';
  if (step <= DIVIDEND_STEP) return `${a} ÷ ${b} = ${q}${r ? ` remainder ${r}` : ''}`;
  if (step === DIVISOR_STEP || step === QUOTIENT_STEP) {
    return groupsAreRows
      ? `${q} group${q === 1 ? '' : 's'} of ${b}${r ? ` + ${r} left over` : ''}`
      : `${b} group${b === 1 ? '' : 's'} of ${q}${r ? ` + ${r} left over` : ''}`;
  }
  // remainder & inverse steps and calibration: the reconstruction identity
  return `${b} × ${q}${r ? ` + ${r}` : ''} = ${a}`;
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DivisionLab() {
  const [a, setA] = useState(START.a);
  const [b, setB] = useState(START.b);
  const [view, setView] = useState('share'); // 'share' (partitive) | 'group' (quotative)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [dealing, setDealing] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // index of the unit square under the pointer, or null
  const dealRef = useRef(null); // # squares currently "dealt" (animation), or null
  const layoutRef = useRef(null); // {ox,oy,s,cols,fullRows,r} for pointer hit-testing
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const q = quotientOf(a, b);
  const r = remainderOf(a, b);
  const groupsAreRows = view === 'group';

  // Snapshot everything the renderer needs so draw() (a stable callback) never
  // reads stale values.
  sceneRef.current = { a, b, view, step, calib };

  const pct = target ? quotientPercent(a, b, target) : 0;
  const calibrated = target ? isCalibrated(a, b, target) : false;

  /* ---- full redraw from state (auto-fit array; no world transform needed) -- */
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
    const A = S.a;
    const B = S.b;
    const vGroupsAreRows = S.view === 'group';
    const st = S.step;
    const isCalib = S.calib;

    const Q = quotientOf(A, B);
    const R = remainderOf(A, B);
    const cols = B;
    const fullRows = Q;
    const rowsExtent = Q + (R > 0 ? 1 : 0);

    const CARM = '#C81E4F';
    const INK = '#1C2B3A';
    const BLUE = 'rgba(199,216,228,0.75)';

    /* ---- layout: fit the block, reserving room for brackets & a top readout - */
    const PAD = 22;
    const leftRes = 46; //  left bracket + its label
    const bottomRes = 38; // bottom bracket + its label
    const topRes = 8;
    const availW = Math.max(20, W - PAD * 2 - leftRes);
    const availH = Math.max(20, H - PAD * 2 - bottomRes - topRes);
    let s = Math.min(availW / Math.max(cols, 1), availH / Math.max(rowsExtent, 1));
    s = Math.max(9, Math.min(s, 56)); // never microscopic, never cartoonishly huge
    const blockW = cols * s;
    const blockH = rowsExtent * s;
    const ox = PAD + leftRes + Math.max(0, (availW - blockW) / 2);
    const oy = PAD + topRes + Math.max(0, (availH - blockH) / 2);

    const cellX = (c) => ox + c * s;
    const cellY = (row) => oy + row * s;

    // remember the layout so the pointer handler can hit-test squares
    layoutRef.current = { ox, oy, s, cols, fullRows, r: R };

    /* ---- quadrille paper, aligned to the cell grid ------------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.6)';
    ctx.beginPath();
    for (let x = ox + Math.ceil((0 - ox) / s) * s; x <= W; x += s) {
      const X = Math.round(x) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let y = oy + Math.ceil((0 - oy) / s) * s; y <= H; y += s) {
      const Y = Math.round(y) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- build the cells in deal order: full rows first, then the remainder - */
    const cells = [];
    for (let row = 0; row < fullRows; row++) {
      for (let c = 0; c < cols; c++) cells.push({ c, row, kind: 'full' });
    }
    for (let c = 0; c < R; c++) cells.push({ c, row: fullRows, kind: 'rem' });
    const dealt = dealRef.current; // null => show all; else only first `dealt`
    const shown = (i) => dealt == null || i < dealt;

    /* ---- group tint: alternate rows (grouping) or columns (sharing) so each
            group reads as a unit. Suppressed during calibration. ------------- */
    if (!isCalib && st >= DIVISOR_STEP && fullRows > 0) {
      ctx.fillStyle = 'rgba(120,150,175,0.14)';
      if (vGroupsAreRows) {
        for (let row = 1; row < fullRows; row += 2) ctx.fillRect(cellX(0), cellY(row), cols * s, s);
      } else {
        for (let c = 1; c < cols; c += 2) ctx.fillRect(cellX(c), cellY(0), s, fullRows * s);
      }
    }

    /* ---- fill the squares (neutral blue; remainder squares carmine) -------- */
    cells.forEach((cell, i) => {
      if (!shown(i)) return;
      ctx.fillStyle = cell.kind === 'rem' ? 'rgba(200,30,79,0.28)' : BLUE;
      ctx.fillRect(cellX(cell.c), cellY(cell.row), s, s);
    });

    /* ---- hovered square highlight ----------------------------------------- */
    const hov = hoverRef.current;
    if (hov != null && hov < cells.length && shown(hov)) {
      const cell = cells[hov];
      ctx.fillStyle = 'rgba(200,30,79,0.34)';
      ctx.fillRect(cellX(cell.c), cellY(cell.row), s, s);
    }

    /* ---- unit borders so the squares are countable ------------------------- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,150,175,0.6)';
    cells.forEach((cell, i) => {
      if (!shown(i)) return;
      ctx.strokeRect(Math.round(cellX(cell.c)) + 0.5, Math.round(cellY(cell.row)) + 0.5, s, s);
    });

    const finished = dealt == null || dealt >= cells.length;

    /* ---- the equal-groups rectangle: the carmine mathematical object -------- */
    if (fullRows > 0 && finished) {
      ctx.save();
      ctx.lineWidth = 2.75;
      ctx.strokeStyle = CARM;
      ctx.strokeRect(cellX(0) + 0.5, cellY(0) + 0.5, cols * s - 1, fullRows * s - 1);
      ctx.restore();
    }

    /* reusable label chip (paper-white background, coloured text) */
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

    /* ---- remainder emphasis: outline the leftovers + label them ----------- */
    if (R > 0 && finished) {
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = CARM;
      for (let c = 0; c < R; c++) {
        ctx.strokeRect(cellX(c) + 1.25, cellY(fullRows) + 1.25, s - 2.5, s - 2.5);
      }
      ctx.restore();
      if (!isCalib) chip(`R = ${R}`, cellX(R) + 9, cellY(fullRows) + s / 2, 'left', CARM);
    }

    /* ---- brackets: b along the bottom, q up the left, captioned by view ---- */
    const hBracket = (xA, xB, yScreen, tick, label) => {
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xA, yScreen);
      ctx.lineTo(xB, yScreen);
      ctx.moveTo(xA, yScreen);
      ctx.lineTo(xA, yScreen - tick);
      ctx.moveTo(xB, yScreen);
      ctx.lineTo(xB, yScreen - tick);
      ctx.stroke();
      ctx.restore();
      chip(label, (xA + xB) / 2, yScreen + 13, 'center', CARM);
    };
    const vBracket = (yA, yB, xScreen, tick, label) => {
      ctx.save();
      ctx.strokeStyle = CARM;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xScreen, yA);
      ctx.lineTo(xScreen, yB);
      ctx.moveTo(xScreen, yA);
      ctx.lineTo(xScreen + tick, yA);
      ctx.moveTo(xScreen, yB);
      ctx.lineTo(xScreen + tick, yB);
      ctx.stroke();
      ctx.restore();
      chip(label, xScreen - 6, (yA + yB) / 2, 'right', CARM);
    };

    // Brackets need at least one complete row to sit against; when a < b the
    // quotient is 0 (the whole total is remainder) and the identity readout
    // carries the meaning, so we draw no brackets over empty cells.
    if (!isCalib && st >= QUOTIENT_STEP && finished && fullRows > 0) {
      // bottom: the divisor's b columns
      const bottomCap = vGroupsAreRows ? 'in each' : 'groups';
      hBracket(cellX(0), cellX(cols), cellY(rowsExtent) + 12, 8, `${B} ${bottomCap}`);
      // left: the q full rows
      const leftCap = vGroupsAreRows ? 'groups' : 'in each';
      vBracket(cellY(0), cellY(fullRows), cellX(0) - 12, 8, `${Q} ${leftCap}`);
    }

    /* ---- hover readout: which square, and whether it is a leftover --------- */
    if (hov != null && hov < cells.length && shown(hov)) {
      const cell = cells[hov];
      const label = cell.kind === 'rem' ? `leftover ${hov - fullRows * cols + 1} of ${R}` : `square ${hov + 1} of ${A}`;
      chip(label, cellX(cell.c) + s / 2, cellY(cell.row) + s / 2, 'center', INK);
    }

    /* ---- top-left readout box: the taught relation, tied to the picture ---- */
    let read = null;
    if (isCalib) {
      read = S.calib && target != null ? `${A} ÷ ${B} = ${Q}${R ? ` R ${R}` : ''}   ·   target ${target}` : null;
    } else if (st <= DIVISOR_STEP) {
      read = `${A} ÷ ${B} = ${Q}${R ? ` R ${R}` : ''}`;
    } else if (st === QUOTIENT_STEP) {
      read = vGroupsAreRows
        ? `${Q} group${Q === 1 ? '' : 's'} of ${B}${R ? ` + ${R}` : ''} = ${A}`
        : `${B} group${B === 1 ? '' : 's'} of ${Q}${R ? ` + ${R}` : ''} = ${A}`;
    } else {
      read = `${A} = ${B} × ${Q}${R ? ` + ${R}` : ''}`; // remainder & inverse steps
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
  }, [a, b, view, step, target, dealing, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* hand a target to the calibration step, and reset to 1 ÷ 1 so it starts
     un-matched (a construction challenge, like the multiplication lab) */
  useEffect(() => {
    if (current.calib) {
      if (!target) setTarget(makeTarget(null));
      setA(1);
      setB(1);
      dealRef.current = null;
      setDealing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the quotient step auto-runs the "deal the squares" sweep the first time */
  useEffect(() => {
    if (step === QUOTIENT_STEP) {
      dealRef.current = null;
      setDealing(true);
    }
  }, [step]);

  /* the deal sweep — time-based (dt), opt-in, respects reduced motion */
  useEffect(() => {
    if (!dealing) return;
    const total = a; // exactly a squares to hand out
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      dealRef.current = total; // no animation — show everything at once
      draw();
      setDealing(false);
      return;
    }
    let raf;
    let start = null;
    const DURATION = Math.min(2600, Math.max(650, total * 95));
    const loop = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      dealRef.current = Math.round(t * total);
      draw();
      if (t < 1) raf = requestAnimationFrame(loop);
      else {
        dealRef.current = null; // settle to the full, static picture
        setDealing(false);
        draw();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dealing, a, b, draw]);

  /* ---- interaction handlers ---------------------------------------------- */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'a') setA(v);
    else setB(v);
    dealRef.current = null; // a change invalidates the running deal
    if (dealing) setDealing(false);
  };

  const toggleView = () => {
    setView((v) => (v === 'share' ? 'group' : 'share'));
    dealRef.current = null;
    if (dealing) setDealing(false);
  };

  const onPointerMove = (e) => {
    const L = layoutRef.current;
    if (!L) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const c = Math.floor((px - L.ox) / L.s);
    const row = Math.floor((py - L.oy) / L.s);
    let i = null;
    if (row >= 0 && c >= 0) {
      if (row < L.fullRows && c < L.cols) i = row * L.cols + c;
      else if (row === L.fullRows && c < L.r) i = L.fullRows * L.cols + c;
    }
    hoverRef.current = i;
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };

  const resetDials = () => {
    setA(START.a);
    setB(START.b);
    dealRef.current = null;
    if (dealing) setDealing(false);
  };

  const choose = (idx) => {
    if (answers[step] != null) return; // lock the answer once given
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };

  const goNext = () => setStep((sIdx) => Math.min(STEPS.length - 1, sIdx + 1));
  const goBack = () => setStep((sIdx) => Math.max(0, sIdx - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const viewWord = groupsAreRows ? 'Grouping' : 'Sharing';
  const spoken =
    `Division array: ${a} squares split by ${b}. ` +
    (groupsAreRows
      ? `${q} group${q === 1 ? '' : 's'} of ${b}`
      : `${b} group${b === 1 ? '' : 's'} of ${q}`) +
    `${r ? `, with ${r} left over` : ''}. ` +
    `${a} divided by ${b} equals ${q}${r ? ` remainder ${r}` : ''}.` +
    (calib && target ? ` Target quotient ${target}.` : '');

  const family = target ? quotientFamily(target) : [];

  return (
    <div className="dlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Division as Equal Groups</h1>
        <p className="lede">
          See <span className="mono">a ÷ b</span> as splitting a squares into equal groups — the{' '}
          <em>inverse</em> of multiplication. Each dial unlocks with the lesson, so you meet one idea at a
          time: the dividend, the divisor, the quotient, what happens with a <em>remainder</em>, and how
          multiplying back checks your answer. Finish by building a division to a target quotient.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              {a} ÷ {b} = {q}
              {r > 0 && <span className="rem"> R {r}</span>}
            </p>
            <p className="equation-sub mono">{subEquation(step, a, b, view)}</p>
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
            <span className="hint mono">
              {calib ? 'tune a and b to the target' : `hover a square · view: ${viewWord.toLowerCase()}`}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — the quotient matches the target.' : ''}
          </p>

          {!calib && step >= DIVISOR_STEP && (
            <div className="legend" aria-hidden="true">
              <span className="sw sw-full" /> equal groups
              <span className="sw sw-rem" /> remainder
              <span className="legend-view mono">
                {groupsAreRows ? `${q} groups of ${b}` : `${b} groups of ${q}`}
                {r > 0 ? ` + ${r}` : ''}
              </span>
            </div>
          )}

          <div className="facts">
            {!calib ? (
              <>
                <div className="fact">
                  <span className="fact-k">Dividend</span>
                  <span className="fact-v mono">{a} · the total</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Divisor</span>
                  <span className="fact-v mono">{b}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Quotient</span>
                  <span className="fact-v mono">{q}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Remainder</span>
                  <span className="fact-v mono">
                    {r}
                    {r === 0 ? ' · divides evenly' : ` · ${r} < ${b}`}
                  </span>
                </div>
                <div className="fact fact-wide">
                  <span className="fact-k">Check (multiply back)</span>
                  <span className="fact-v mono">
                    {b} × {q}
                    {r ? ` + ${r}` : ''} = {a}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="fact">
                  <span className="fact-k">Your division</span>
                  <span className="fact-v mono">
                    {a} ÷ {b} = {q}
                    {r ? ` R ${r}` : ''}
                  </span>
                </div>
                <div className="fact">
                  <span className="fact-k">Target quotient</span>
                  <span className="fact-v mono">{target ?? '—'}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Remainder</span>
                  <span className="fact-v mono">{r}</span>
                </div>
                <div className="fact">
                  <span className="fact-k">Exact?</span>
                  <span className="fact-v mono">{calibrated ? `${a} = ${target} × ${b} ✓` : 'not yet'}</span>
                </div>
              </>
            )}
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (dealing ? ' on' : '')}
              onClick={() => {
                dealRef.current = null;
                setDealing(true);
              }}
            >
              {dealing ? 'Dealing…' : 'Deal the squares'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={toggleView}
              disabled={step < DIVISOR_STEP}
              title={
                step < DIVISOR_STEP
                  ? 'Unlocks at the divisor step'
                  : 'Switch between the two meanings of division'
              }
            >
              View: {viewWord}
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
              const val = { a, b }[d.key];
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk">{d.label}</span>
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

          {current.calib && target && (
            <div className="calib">
              <p className="calib-goal">
                Target quotient: <strong>{target}</strong> (with no remainder)
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
                    {r !== 0
                      ? `remainder ${r} — not exact`
                      : q < target
                      ? `quotient ${q} too small`
                      : `quotient ${q} too big`}
                  </span>
                )}
              </div>
              {calibrated && (
                <p className="factnote">
                  {a} ÷ {b} = {target}, because {target} × {b} = {a}. Other divisions with quotient {target}:{' '}
                  {family.map((p, i) => (
                    <span key={i} className="mono">
                      {i > 0 ? ', ' : ''}
                      {p[0]}÷{p[1]}
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
                  dealRef.current = null;
                  setDealing(false);
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
        <span className="mono">a ÷ b</span> &nbsp;·&nbsp; the equal-groups model of division, built live
        from the dials — a = b × q + r on a quadrille grid.
      </footer>

      <style jsx>{`
        .dlab {
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
        .equation .rem {
          color: var(--curve);
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
        .legend .sw-full {
          background: rgba(199, 216, 228, 0.85);
          margin-left: 0;
        }
        .legend .sw-rem {
          background: rgba(200, 30, 79, 0.28);
          border-color: rgba(200, 30, 79, 0.6);
        }
        .legend-view {
          margin-left: auto;
          color: var(--curve);
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
