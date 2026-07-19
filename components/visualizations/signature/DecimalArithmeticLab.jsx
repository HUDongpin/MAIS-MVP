'use client';

/* ============================================================================
   DecimalArithmeticLab — an interactive "bench" for ADDING DECIMALS:
   aligning the PLACES, not the digits.

        3.7 + 0.25:  line up the LAST digits (the whole-number habit)
                     and the columns add 7 tenths to 5 hundredths — a count
                     of nothing.  Line up the POINTS and every column holds
                     one place: 3.70 + 0.25 = 3.95.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 5 lab — CCSS
   5.NBT.B.7 ("add, subtract, multiply, and divide decimals to hundredths,
   using concrete models or drawings and strategies based on place value …
   relate the strategy to a written method and explain the reasoning").  This
   lab is the ADDITION corner of that standard, built around the one decision
   the written method actually turns on: WHERE THE NUMBERS SIT.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE POINT LINE."
     Two decimal numbers as DIGIT CARDS on place-column rails (tens · ones ·
     tenths · hundredths), and one gold dashed vertical — the point line —
     running through the frame where the ones end and the tenths begin.
     B's rail SLIDES.  Parked by the whole-number habit (last digit under
     last digit), B's point hangs off the line and every shared column holds
     TWO place names at once; the digit machine still cheerfully adds the
     columns and prints 62 — and the lab lets it, because the honest question
     is not "what is 62?" but "62 of WHAT?"  No column can say.  Slide B
     until its point clicks onto the line and the frame heals: each column
     one name, the empty hundredths under the 7 filled by a hollow gold
     PARTNER ZERO (3.7 becomes 3.70, the same number with its column held
     open), and the sum arrives place by place — with the ten-for-one carry
     working exactly as it always has, because the decimal point is furniture
     of the FRAME, not a wall in the machine.  The point of the sum falls
     straight down the point line, not "wherever the digits end."

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DecimalLab owns WHAT a decimal is: the 10×10 hundredths grid and the
       zoomable number line.  No grid, no number line, and no magnifier
       appears here — this lab assumes the places and OPERATES on them.
     • PlaceValueStrategiesLab owns the whole-number addition chart with
       BASE-TEN BLOCKS pooled in bins and a haloed bundle riding up.  There
       are no blocks anywhere in this lab: digits stay written digits (the
       written method IS the subject), and the carry appears only as the
       small carried digit of the paper algorithm.
     • RegroupingSubtractionLab owns the mirror move (break a ten).  Nothing
       is subtracted in this lab.
     • MoneyLab owns money as decimal place value in disguise.  No dollar,
       no cent, no currency framing appears here.
     • ComparingLab owns lining two numbers up by place to COMPARE them
       (the left-to-right digit scan, the >/< symbols).  Here the line-up
       exists to ADD; nothing is compared and no relation symbol appears.

   One-accent discipline: CARMINE is THE LEGAL SUM — the carried digits, the
   answer cards, and the answer's point.  The two addends are quiet
   slate-blue digit cards; GOLD is the STRUCTURE the lab is named for — the
   point line and the partner zero.  The misaligned digit-machine output is
   SLATE (it is not mathematics, so it gets no colour).  GREEN is reserved
   for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • A is an exact integer count of TENTHS (11–99); B an exact integer
       count of HUNDREDTHS (11–99, never a multiple of ten, so B genuinely
       owns a hundredths digit).  Every displayed value is built from those
       integers by string — no float ever decides a digit.
     • The column machine (digits + carries) provably reconstructs
       10·A + B for every dial pair — audited exhaustively, all 7,921 pairs.
     • The right-edge ghost (A + B, read as one decimal by the habit) is
       provably NEVER the true sum, for every dial pair.
     • The capstone's three answer cards are provably pairwise distinct for
       every patient, and the stamp needs the point aligned AND the true
       card chosen — a wrong card locks the round, so the stamp cannot be
       reached by cycling guesses.
   Verified by audit-decimalarithmetic.mjs (numeric proof + source greps)
   and verify-decimalarithmetic.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DecimalArithmeticLab.jsx
     2. Import and render it:
          import DecimalArithmeticLab from './DecimalArithmeticLab';
          export default function Page() { return <DecimalArithmeticLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two addends,
              where B sits, the lesson step, the chosen answer card).
     MODEL  — pure integer arithmetic in tenths/hundredths; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Three dials: where B sits (the whole lesson), then
   the two addends.  pos = B's offset in columns from the correct spot
   (−1 = one column left, the right-edge habit; 0 = points aligned;
   +1 = one column too far right, the last digit off the table).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the legal sum: the carries, the answer, its point
const ADDEND = '#5b7a99'; // the two addends' digit cards — quiet slate-blue
const GOLD = '#b98718'; // the structure: the point line, the partner zero

const DIALS = [
  { key: 'pos', name: 'Slide B', role: 'where B sits · −1, 0, +1 columns', min: -1, max: 1, unlock: 2, color: GOLD },
  { key: 'a', name: 'A', role: 'ones and tenths · 1.1–9.9', min: 11, max: 99, unlock: 3, color: ADDEND },
  { key: 'b', name: 'B', role: 'tenths and hundredths · 0.11–0.99', min: 11, max: 99, unlock: 4, color: ADDEND },
];
const START_A = 37; // 3.7, in tenths
const START_B = 25; // 0.25, in hundredths
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  A lives in integer TENTHS, B in integer HUNDREDTHS.
   Nothing below ever computes with a float.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* B must genuinely own a hundredths digit — a multiple of ten (0.30) is a
   tenths number in costume, and the right-edge habit would accidentally
   work on it.  The dial skips those values. */
const clampB = (v) => {
  const b = clampInt(v, 11, 99);
  return b % 10 === 0 ? b + 1 : b;
};

const digitsA = (aT) => [Math.floor(aT / 10), aT % 10]; // [ones, tenths]
const digitsB = (bH) => [0, Math.floor(bH / 10), bH % 10]; // [ones, tenths, hundredths]

/* the true sum, in exact integer hundredths */
const trueSumH = (aT, bH) => aT * 10 + bH;

/* the right-edge habit: last digit under last digit, add the digit strings.
   As digits that is the integer aT + bH ("62"); read back as a one-decimal
   number (the classic wrong answer) it claims (aT + bH) tenths. */
const ghostDigits = (aT, bH) => aT + bH;
const ghostReadH = (aT, bH) => (aT + bH) * 10; // "6.2", in hundredths

const hasCarry = (aT, bH) => (aT % 10) + Math.floor(bH / 10) >= 10;

/* the column machine: add place by place, trading ten-for-one leftward.
   Returns digits [tens, ones, tenths, hundredths] and the two carry flags. */
function columnAdd(aT, bH) {
  const h = bH % 10;
  const tRaw = (aT % 10) + Math.floor(bH / 10);
  const carryT = tRaw >= 10; // ten tenths trade for one one
  const t = tRaw % 10;
  const oRaw = Math.floor(aT / 10) + (carryT ? 1 : 0);
  const carryO = oRaw >= 10; // ten ones trade for one ten
  const o = oRaw % 10;
  const tens = carryO ? 1 : 0;
  return { tens, ones: o, tenths: t, hundredths: h, carryT, carryO };
}

/* exact formatting — digits by string, never a float */
const fmtT = (aT) => `${Math.floor(aT / 10)}.${aT % 10}`;
const fmtH = (h) => `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}`;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The alignment surgeon."  A fresh pair arrives with
   B parked by the old habit (one column left).  Two tasks: slide B's point
   onto the point line, then pick the true sum from three cards:
     · the true sum                       (place by place, with the carry)
     · the habit's answer  (aT + bH)/10   ("just add the digits")
     · the near miss: the carry dropped, or a phantom carry added
   Provably distinct for every patient; a wrong pick locks the round, so the
   stamp can never be guessed into firing.
   ------------------------------------------------------------------------- */
function cardsFor(aT, bH) {
  const truth = trueSumH(aT, bH);
  const ghost = ghostReadH(aT, bH);
  /* dropping a real tenths-carry loses ten tenths = 100 hundredths; if no
     carry exists, the foil is a PHANTOM carry: 100 hundredths too many */
  const third = hasCarry(aT, bH) ? truth - 100 : truth + 100;
  return [truth, ghost, third];
}
/* deterministic shuffle so the true card is not always first */
const cardOrder = (aT, bH) => {
  const r = (aT + bH) % 3;
  return [r, (r + 1) % 3, (r + 2) % 3]; // display slot -> card id
};
function makePatient(prev) {
  let aT;
  let bH;
  do {
    aT = 11 + Math.floor(Math.random() * 89); // 11…99 tenths
    bH = clampB(11 + Math.floor(Math.random() * 89)); // 11…99, never ×10
  } while (prev != null && aT === prev.aT && bH === prev.bH);
  return { aT, bH };
}
const calibChecks = (pos, pick, aT, bH) => [pos === 0, pick != null && cardOrder(aT, bH)[pick] === 0];
const isCalibrated = (pos, pick, aT, bH) => calibChecks(pos, pick, aT, bH).every(Boolean);
const closeness = (pos, pick, aT, bH) => {
  const c = calibChecks(pos, pick, aT, bH);
  return (c[0] ? 50 : 0) + (c[1] ? 50 : 0);
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback; the
   trap is the whole-number habit.  Next gates on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A digit is worth its column',
    body: 'One number, four columns. 3.7 sits on the rails: the 3 in the ones column, the 7 in the tenths column, its point on the gold point line.',
    q: 'What does the 7 in 3.7 count?',
    choices: ['7 tenths — the column it sits in', '7 ones — a digit is always itself', '7 hundredths'],
    answer: 0,
    feedback:
      'Seven tenths. A digit means nothing until its column says what it counts — the same 7 one ' +
      'column left would be 7 ones. The gold line marks where ones end and tenths begin; every ' +
      'number parks its point on some such line.',
  },
  {
    title: 'The old habit',
    body: 'B = 0.25 arrives, parked the way whole numbers taught you: last digit under last digit. The digit machine adds the columns anyway and prints 62.',
    q: 'Right-aligned, the columns added 7 and 5, then 3 and 2, and printed 62. 62 of what?',
    choices: [
      'Nothing — each column mixed two different places',
      '62 hundredths, so 0.62',
      '6.2 — keep one decimal, like A has',
    ],
    answer: 0,
    feedback:
      'Nothing. The right-hand column held 7 TENTHS over 5 HUNDREDTHS — two different names in ' +
      'one column, like adding apples to oranges. The machine can add digits all day; no column can ' +
      'say what the total counts. With whole numbers the habit worked only because last digit ' +
      'always meant ONES.',
  },
  {
    title: 'Slide to the point',
    body: 'The Slide B dial is yours. Move B until its point clicks onto the gold line — points over points, places over places.',
    q: 'Aligned, the hundredths column under the 7 is empty, and a hollow 0 fills it: 3.7 becomes 3.70. What changed?',
    choices: [
      'Nothing — 0 hundredths adds nothing; the column is just held open',
      'The number got ten times bigger',
      'It became 370',
    ],
    answer: 0,
    feedback:
      'Nothing changed. The partner zero is a placeholder: 3.70 is 3.7 with its empty hundredths ' +
      'column written down. Now every column holds ONE place — tenths with tenths, hundredths ' +
      'with hundredths — and the sum can be trusted: 3.70 + 0.25 = 3.95.',
  },
  {
    title: 'The columns still trade',
    body: 'The A dial is unlocked. Try 3.7 + 0.65: the tenths column adds 7 + 6 = 13. Watch the small carried digit.',
    q: '13 tenths — what does the machine do with them?',
    choices: [
      'Trade ten of them for 1 one: write 3, carry 1 across the point',
      'Write 13 in the tenths column',
      'Stop — you cannot carry across a decimal point',
    ],
    answer: 0,
    feedback:
      'The same ten-for-one trade as always: ten tenths ARE one one, so 13 tenths is 1 one and 3 ' +
      'tenths, and the little 1 rides into the ones column. The decimal point is furniture of the ' +
      'FRAME, not a wall in the machine — every column still trades ten for the next place left.',
  },
  {
    title: 'The point falls straight down',
    body: 'The B dial is unlocked. Change both numbers however you like — the answer’s point never wanders.',
    q: 'Why does the sum’s point always land exactly below the addends’ points?',
    choices: [
      'It marks the ones–tenths border of the frame, and the columns do not move',
      'It moves right when the numbers get big',
      'It sits after the same number of digits as A has',
    ],
    answer: 0,
    feedback:
      'The point is the frame’s border between ones and tenths — the columns hold still, so the ' +
      'point falls straight down the gold line into the answer. "Align the points" was never a ' +
      'trick to memorise: it is what "align the places" looks like on paper.',
  },
  {
    title: 'The alignment surgeon',
    body: 'A fresh pair, parked by the old habit. Slide B’s point onto the line, then pick the true sum. When both are right, it is calibrated.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DecimalArithmeticLab() {
  const [aT, setAT] = useState(START_A); // A, integer tenths
  const [bH, setBH] = useState(START_B); // B, integer hundredths
  const [pos, setPos] = useState(-1); // B's offset: −1 left, 0 aligned, +1 right
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [pick, setPick] = useState(null); // capstone: chosen sum card

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const showB = step >= 1;

  const pct = calib ? closeness(pos, pick, aT, bH) : 0;
  const calibrated = calib ? isCalibrated(pos, pick, aT, bH) : false;
  const checks = calib ? calibChecks(pos, pick, aT, bH) : [false, false];

  sceneRef.current = { aT, bH, pos, showB, calib, pickDone: pick != null };

  /* ---- full redraw from state ------------------------------------------- */
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

    const INK = '#1c2b3a';
    const INK_SOFT = '#5b6b7b';
    const S = sceneRef.current;

    const rr = (x, y, w, h, rad) => {
      const rC = Math.max(0, Math.min(rad, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + rC, y);
      ctx.arcTo(x + w, y, x + w, y + h, rC);
      ctx.arcTo(x + w, y + h, x, y + h, rC);
      ctx.arcTo(x, y + h, x, y, rC);
      ctx.arcTo(x, y, x + w, y, rC);
      ctx.closePath();
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

    /* THE FRAME — five place columns and a dangling zone past the edge.
       col index: 0 tens · 1 ones · 2 tenths · 3 hundredths · 4 off-the-table.
       The point line runs between col 1 and col 2. */
    const colW = Math.min(86, (W - 60) / 5.4);
    const gap = 12; // the visual gap the point dots live in
    const frameW = colW * 4 + gap;
    const fx = (W - frameW - colW * 0.9) / 2; // leave room for the dangling zone
    const colX = (c) => fx + c * colW + (c >= 2 ? gap : 0);
    const pointX = fx + 2 * colW + gap / 2; // the gold point line

    const cardH = Math.min(56, H * 0.13);
    const yHead = H * 0.115;
    const yA = H * 0.24;
    const yB = H * 0.42;
    const yRule = yB + cardH + 26;
    const ySum = yRule + 20;

    const NAMES = ['tens', 'ones', 'tenths', 'hundredths', '— ? —'];

    /* column headers */
    ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    for (let c = 0; c < 5; c++) {
      ctx.fillStyle = c === 4 ? 'rgba(91,107,123,0.6)' : INK_SOFT;
      ctx.fillText(NAMES[c], colX(c) + colW / 2, yHead);
      if (c < 4) {
        ctx.strokeStyle = 'rgba(28,43,58,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(colX(c) + 4.5, yHead + 8.5, colW - 9, ySum + cardH - yHead + 8);
      }
    }

    /* THE POINT LINE — gold, dashed, the whole lab */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(pointX + 0.5, yHead - 14);
    ctx.lineTo(pointX + 0.5, ySum + cardH + 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GOLD;
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('the point line', pointX, yHead - 22);

    const [aOnes, aTenths] = digitsA(S.aT);
    const [bOnes, bTenths, bHund] = digitsB(S.bH);
    const aligned = S.pos === 0;

    /* the x of the border line just right of column c (col 1's border IS the
       point line) */
    const borderX = (c) => (c === 1 ? pointX : fx + (c + 1) * colW + (c + 1 >= 2 ? gap : 0));
    /* does row A occupy column c? (ones, tenths; hundredths once the partner
       zero is placed) */
    const rowAHas = (c) => c === 1 || c === 2 || (aligned && S.showB && c === 3);

    /* a digit card: value, its own place tag, at column c on row y */
    const card = (c, y, d, tag, opts = {}) => {
      const x = colX(c) + 7;
      const w = colW - 14;
      ctx.fillStyle = opts.fill || '#fff';
      ctx.strokeStyle = opts.stroke || ADDEND;
      ctx.lineWidth = opts.hollow ? 1.6 : 2;
      if (opts.hollow) ctx.setLineDash([4, 4]);
      rr(x, y, w, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = opts.ink || INK;
      ctx.font = `700 ${Math.round(cardH * 0.5)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(d), x + w / 2, y + cardH * 0.52);
      ctx.font = '600 9.5px system-ui, sans-serif';
      ctx.fillStyle = opts.tagInk || INK_SOFT;
      ctx.fillText(tag, x + w / 2, y + cardH - 7);
    };
    /* ---- row A: ones + tenths, point on the line -------------------------- */
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`A = ${fmtT(S.aT)}`, fx - 4, yA - 8);
    card(1, yA, aOnes, 'ones');
    card(2, yA, aTenths, 'tenths');
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(pointX, yA + cardH - 9, 4.5, 0, Math.PI * 2);
    ctx.fill();
    /* the partner zero, once aligned and B is in play */
    if (S.showB && aligned) {
      card(3, yA, 0, 'hundredths', { stroke: GOLD, hollow: true, ink: GOLD, tagInk: GOLD, fill: 'rgba(185,135,24,0.05)' });
    }

    /* ---- row B: slides with pos ------------------------------------------- */
    if (S.showB) {
      /* B's digits [ones, tenths, hundredths] occupy columns [1,2,3] + pos */
      const off = S.pos;
      const bd = [bOnes, bTenths, bHund];
      const tags = ['ones', 'tenths', 'hundredths'];
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`B = ${fmtH(S.bH)}${aligned ? '' : '  — parked wrong'}`, fx - 4, yB - 24);
      for (let i = 0; i < 3; i++) {
        const c = 1 + i + off;
        if (c > 4) continue;
        const colName = c <= 3 ? NAMES[c] : null;
        const clash = colName != null && colName !== tags[i] && rowAHas(c);
        card(c, yB, bd[i], tags[i], clash ? { stroke: CARMINE, fill: 'rgba(200,30,79,0.06)' } : c === 4 ? { stroke: INK_SOFT, fill: 'rgba(91,107,123,0.07)' } : {});
        if (clash) {
          ctx.fillStyle = CARMINE;
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('two names!', colX(c) + colW / 2, yB - 6);
        }
        if (c === 4) {
          ctx.fillStyle = INK_SOFT;
          ctx.font = 'italic 600 10.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('no column', colX(4) + colW / 2, yB - 6);
        }
      }
      /* B's point: between its ones and tenths cards — on the gold line only
         when aligned */
      const bPointX = borderX(1 + off);
      ctx.fillStyle = aligned ? GOLD : INK;
      ctx.beginPath();
      ctx.arc(bPointX, yB + cardH - 9, 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (!aligned) {
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(bPointX, yB + cardH - 9);
        ctx.lineTo(pointX, yB + cardH - 9);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* ---- the rule and the sum --------------------------------------------- */
    if (S.showB) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx - 26, yRule + 0.5);
      ctx.lineTo(fx + 4 * colW + gap + 10, yRule + 0.5);
      ctx.stroke();
      ctx.font = '700 20px ui-monospace, Menlo, monospace';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText('+', fx - 16, yB + cardH * 0.6);

      if (aligned) {
        /* the legal sum, place by place, carries riding left — but in the
           capstone the answer is the child's to give: the row holds ?-cards
           until a card is picked */
        const hide = S.calib && !S.pickDone;
        const m = columnAdd(S.aT, S.bH);
        if (!hide) {
          ctx.font = '700 13px ui-monospace, Menlo, monospace';
          ctx.fillStyle = CARMINE;
          if (m.carryT) ctx.fillText('1', colX(1) + colW / 2, yA - 16);
          if (m.carryO) ctx.fillText('1', colX(0) + colW / 2, yA - 16);
        }
        const sumCards = [
          [0, m.tens, 'tens', m.tens > 0],
          [1, m.ones, 'ones', true],
          [2, m.tenths, 'tenths', true],
          [3, m.hundredths, 'hundredths', true],
        ];
        for (const [c, d, tag, show] of sumCards) {
          if (!show) continue;
          card(c, ySum, hide ? '?' : d, tag, { stroke: CARMINE, ink: CARMINE, fill: 'rgba(200,30,79,0.04)' });
        }
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(pointX, ySum + cardH - 9, 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (!S.calib) {
          ctx.font = '700 15px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`= ${fmtH(trueSumH(S.aT, S.bH))}`, colX(4) + 6, ySum + cardH * 0.58);
        }
      } else if (S.pos < 0) {
        /* the digit machine's cheerful nonsense: right-aligned digit sum */
        const g = String(ghostDigits(S.aT, S.bH));
        ctx.font = `700 ${Math.round(cardH * 0.5)}px ui-monospace, Menlo, monospace`;
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = 'center';
        /* rightmost ghost digit lands under the rightmost occupied column (2) */
        for (let i = 0; i < g.length; i++) {
          const c = 2 - (g.length - 1 - i);
          ctx.fillText(g[i], colX(c) + colW / 2, ySum + cardH * 0.52);
        }
        ctx.font = 'italic 600 13px system-ui, sans-serif';
        ctx.fillText('…of what? no column can say', colX(3) + colW * 1.1, ySum + cardH * 0.52);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('? point ?', pointX, ySum + cardH + 14);
      } else {
        /* pos = +1: the last digit fell off the table — the machine jams */
        ctx.font = 'italic 600 13.5px system-ui, sans-serif';
        ctx.fillStyle = INK_SOFT;
        ctx.textAlign = 'center';
        ctx.fillText('the machine jams — a digit has no column to sit in', fx + frameW / 2, ySum + cardH * 0.5);
      }
    }
  }, []);

  useEffect(() => {
    draw();
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* every step opens on the scene its words describe */
  useEffect(() => {
    if (current.calib) {
      const p = makePatient(null);
      setAT(p.aT);
      setBH(p.bH);
      setPos(-1); // parked by the old habit
      setPick(null);
      return;
    }
    if (step === 0) {
      setAT(START_A);
      setBH(START_B);
      setPos(-1);
    } else if (step === 1) {
      setAT(START_A);
      setBH(START_B);
      setPos(-1);
    } else if (step === 2) {
      setPos(-1); // the child slides it home
    } else if (step === 3) {
      setAT(37);
      setBH(65); // 7 + 6 tenths: the carry
      setPos(0);
    } else if (step === 4) {
      setPos(0);
    }
    setPick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const setDial = (key, v) => {
    if (key === 'pos') setPos(clampInt(v, -1, 1));
    if (key === 'a') setAT(clampInt(v, 11, 99));
    if (key === 'b') setBH(clampB(v));
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const newPatient = () => {
    const p = makePatient({ aT, bH });
    setAT(p.aT);
    setBH(p.bH);
    setPos(-1);
    setPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);
  const dialValue = (k) => (k === 'pos' ? pos : k === 'a' ? aT : bH);

  const order = cardOrder(aT, bH);
  const cards = cardsFor(aT, bH);
  const aligned = pos === 0;

  const spoken = `A is ${fmtT(aT)}${showB ? `, B is ${fmtH(bH)}, B sits ${pos === 0 ? 'aligned on the point line' : pos < 0 ? 'one column left of the point line' : 'one column right of the point line'}` : ''}.${
    aligned && showB ? ` The sum is ${fmtH(trueSumH(aT, bH))}.` : ''
  }${calibrated ? ' Calibrated.' : ''}`;

  return (
    <div className="dalab">
      <header className="head">
        <h1>Adding Decimals: Align the Places</h1>
        <p className="lede">
          The whole-number habit says <em>line up the last digits</em>. Decimals ask for something
          truer: <span className="mono">line up the places</span> — and the point line is where
          every place agrees to meet.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>
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
            {DIALS.map((d) => {
              const unlocked = step >= d.unlock;
              const v = dialValue(d.key);
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={1}
                    value={v}
                    disabled={!unlocked}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => setDial(d.key, Number(e.target.value))}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                    {unlocked ? (d.key === 'pos' ? (v > 0 ? `+${v}` : v) : d.key === 'a' ? fmtT(v) : fmtH(v)) : '🔒'}
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

          {calib && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The alignment surgeon</span>
                <p className="patient mono">
                  {fmtT(aT)} + {fmtH(bH)} = ?
                </p>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} B’s point on the point line</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the true sum picked</li>
                </ol>
                <span className="target-hint mono">
                  {!checks[0]
                    ? 'slide B home first'
                    : pick == null
                      ? 'now pick the sum'
                      : checks[1]
                        ? 'a legal sum'
                        : 'not that one — New patient to retry'}
                </span>
              </div>
              <div className="cards">
                {order.map((cardId, slot) => {
                  const val = cards[cardId];
                  const isPicked = pick === slot;
                  const isTrue = cardId === 0;
                  let cls = 'sumcard';
                  if (pick != null) {
                    if (isPicked && isTrue) cls += ' correct';
                    else if (isPicked) cls += ' wrong';
                    else cls += ' dim';
                  }
                  return (
                    <button
                      type="button"
                      key={slot}
                      className={cls}
                      disabled={!aligned || pick != null}
                      onClick={() => setPick(slot)}
                    >
                      {fmtH(val)}
                    </button>
                  );
                })}
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">align · add · answer</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newPatient}>
                New patient
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
                  setAT(START_A);
                  setBH(START_B);
                  setPos(-1);
                  setPick(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">places over places ⇒ the point falls straight down</span> &nbsp;·&nbsp;
        add decimals to hundredths with strategies based on place value, related to the written
        method (CCSS 5.NBT.B.7). Digits are worth their columns — so the columns, not the digits,
        decide where the numbers sit.
      </footer>

      <style jsx>{`
        .dalab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --addend: #5b7a99;
          --gold: #b98718;
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab phone lesson) */
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .panel {
          min-width: 0;
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          min-height: 430px;
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
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 4 / 5;
            min-height: 400px;
          }
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
          background: var(--carmine);
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
          grid-template-columns: 96px 1fr 48px;
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
          font-weight: 600;
          font-size: 15px;
        }
        .drole {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--ink-soft);
        }
        .dial input[type='range'] {
          grid-column: 2;
          width: 100%;
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
          font-weight: 700;
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
          border-left: 3px solid var(--carmine);
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
          gap: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(28, 43, 58, 0.16);
          border-radius: 8px;
          background: rgba(185, 135, 24, 0.07);
        }
        .target-k {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .patient {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
        }
        .tasks {
          margin: 0;
          padding: 0 0 0 4px;
          list-style: none;
          font-size: 13.5px;
          display: grid;
          gap: 4px;
        }
        .tasks li.done {
          color: var(--ok);
          font-weight: 600;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .sumcard {
          font: 700 16px/1 var(--mono);
          padding: 12px 6px;
          border: 2px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .sumcard:not(:disabled):hover {
          border-color: var(--ink);
        }
        .sumcard:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }
        .sumcard.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          opacity: 1;
        }
        .sumcard.wrong {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.07);
          opacity: 1;
        }
        .sumcard.dim {
          opacity: 0.45;
        }
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--carmine));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13px;
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
        :global(.dalab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .sumcard {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
