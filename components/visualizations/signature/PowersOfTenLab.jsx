'use client';

/* ============================================================================
   PowersOfTenLab — an interactive "bench" for MULTIPLYING AND DIVIDING BY
   POWERS OF TEN: the digits slide, the point stays.

        2.5 × 10  = 25      every digit moves ONE column left
        2.5 × 10³ = 2500    the exponent counts the presses
        2.5 ÷ 10  = 0.25    every digit moves ONE column right

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 5 lab — CCSS
   5.NBT.A.2 ("explain patterns in the number of zeros of the product when
   multiplying a number by powers of 10, and explain patterns in the placement
   of the decimal point when a decimal is multiplied or divided by a power of
   10; use whole-number exponents to denote powers of 10"), on the foundation
   of 5.NBT.A.1 (each place is ten times the place to its right).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE BOLTED POST."
     Seven place columns, and between ones and tenths a gold post, BOLTED
     DOWN.  The number is a pair of carmine digit cards sitting in columns.
     Press ×10 and the digits — not the point — slide one column left; press
     ÷10 and they slide one column right.  Because each column is worth ten
     times its right-hand neighbour (5.NBT.A.1, taken as given), one slide IS
     one factor of ten; the exponent on the readout simply counts the
     presses.  The famous school rules then stop being rules and become
     footage: "just add a zero" is refuted on screen (2.5 × 10 is 25, and
     2.50 is the same number wearing an extra card), and the zeros that DO
     appear are PLACEHOLDERS — hollow gold cards holding open the vacated
     columns between the digits and the bolted post.  "The decimal point
     moves" is retold honestly: the point is furniture of the frame; it is
     the digits that march past it.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • ExponentRulesLab (Grade 8) owns the FACTOR TRAIN: a power as a train
       of factor tiles above/below a fraction bar, and the algebra of the
       rules.  No factor tiles, no trains, no fraction bar, no b^m appears
       here — the exponent in this lab is a COUNT OF SLIDES, never a count
       of factors, and no two powers are ever combined.
     • NumberLab owns the place-value chart with BASE-TEN BLOCKS and the
       proportional value bar — what a place IS.  No blocks and no value bar
       appear here; the columns are assumed and the subject is the MOTION
       across them.
     • DecimalLab owns the 10×10 hundredths grid and the zoomable number
       line.  Neither appears.
     • DecimalArithmeticLab (this lab's new sibling) owns TWO numbers
       stacked, alignment, and the carry.  This lab holds exactly ONE
       number; nothing is added and nothing carries.
     • MultiplesLab owns skip-counting; nothing here counts by tens — one
       press multiplies by ten, a different act entirely.

   One-accent discipline: CARMINE is THE NUMBER — its digit cards, its slide
   arrows, its value readout.  GOLD is the STRUCTURE — the bolted post and
   the placeholder zeros that serve it.  The add-a-zero habit's output is
   SLATE (it is not mathematics).  GREEN is reserved for "correct" and
   CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • The number is two dial digits (ones 1–9, tenths 0–9) at a shift k,
       held as EXACT INTEGER THOUSANDTHS: value = (100·(10·d₁+d₂))·10ᵏ for
       k ≥ 0 and the exact integer quotient for k < 0 (provably exact,
       because the base carries a factor of 100).  No float ever decides a
       digit; every displayed string is built by integer place value.
     • The column picture provably spells the value: reading the cards and
       placeholder zeros left to right, with the post as the point, yields
       exactly the formatted number — audited for every start × every shift.
     • The zero pattern is proved, not asserted: a whole-digit start gains
       exactly k trailing zeros under ×10ᵏ; a start with a tenths digit
       gains exactly k−1 (the first slide consumes the tenths digit).
     • The capstone's three flight-log cards are provably one-true-two-false
       for every mission, and the stamp needs the digits parked on target
       AND the true log picked — a wrong pick locks the round.
   Verified by audit-powersoften.mjs (numeric proof + source greps) and
   verify-powersoften.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PowersOfTenLab.jsx
     2. Import and render it:
          import PowersOfTenLab from './PowersOfTenLab';
          export default function Page() { return <PowersOfTenLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two digits, the
              shift k, the lesson step, the mission, the picked log).
     MODEL  — pure integer arithmetic in thousandths; it knows no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two digit dials build the start; the ×10 / ÷10
   buttons are the lab's verbs.  k is the net shift from the start position:
   +3 … −2 keeps every digit inside the seven columns.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the number: its digits, its motion, its value
const GOLD = '#b98718'; // the structure: the bolted post, the placeholder zeros
const SLATE = '#5b6b7b'; // the habit's output — not mathematics, so no colour

const DIALS = [
  { key: 'd1', name: 'Ones digit', role: 'the card in the ones column · 1–9', min: 1, max: 9, unlock: 2, color: CARMINE },
  { key: 'd2', name: 'Tenths digit', role: 'the card in the tenths column · 0–9', min: 0, max: 9, unlock: 3, color: CARMINE },
];
const SHIFT_MIN = -2;
const SHIFT_MAX = 3;
const START_D1 = 2;
const START_D2 = 5;
const CALIB_STEP = 5;

/* superscripts for the exponent readout */
const SUP = ['⁰', '¹', '²', '³', '⁴'];
const expStr = (n) => SUP[n] || String(n);

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Everything in exact integer THOUSANDTHS.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* the base (k = 0) in thousandths: d₁ ones + d₂ tenths */
const baseTh = (d1, d2) => (d1 * 10 + d2) * 100;

/* the value at shift k, exact: the base is a multiple of 100, so dividing
   by 10 or 100 is exact integer division */
function valueTh(d1, d2, k) {
  const b = baseTh(d1, d2);
  return k >= 0 ? b * 10 ** k : b / 10 ** -k;
}

/* exact decimal string from integer thousandths — digits by string, no float */
function fmtTh(v) {
  const whole = Math.floor(v / 1000);
  const frac = String(v % 1000).padStart(3, '0').replace(/0+$/, '');
  return frac.length ? `${whole}.${frac}` : String(whole);
}

/* the column picture.  Columns 0…6 = thousands … thousandths; the post sits
   between 3 and 4.  Digit d₁ lives at column 3−k, d₂ (if nonzero) at 4−k;
   hollow gold zeros hold every vacated column between the digits and the
   post, plus the leading zero in the ones column when the number is < 1. */
function columnsOf(d1, d2, k) {
  const cols = new Array(7).fill(null);
  const c1 = 3 - k;
  const c2 = 4 - k;
  cols[c1] = { d: d1, kind: 'sig' };
  const right = d2 !== 0 ? (cols[c2] = { d: d2, kind: 'sig' }, c2) : c1;
  /* zeros between the last digit and the post (the "pattern of zeros") */
  for (let c = right + 1; c <= 3; c++) if (!cols[c]) cols[c] = { d: 0, kind: 'zero' };
  /* zeros between the post and the first digit, and the leading ones zero */
  if (c1 >= 4) {
    cols[3] = { d: 0, kind: 'zero' };
    for (let c = 4; c < c1; c++) if (!cols[c]) cols[c] = { d: 0, kind: 'zero' };
  }
  return cols;
}

/* read the column picture back as a string — the proof that the placeholder
   zeros are exactly right lives in the audit, which compares this to fmtTh */
function spellColumns(cols) {
  let s = '';
  let started = false;
  for (let c = 0; c <= 3; c++) {
    if (cols[c]) {
      s += String(cols[c].d);
      started = true;
    } else if (started) s += '?';
  }
  let frac = '';
  for (let c = 4; c <= 6; c++) frac += cols[c] ? String(cols[c].d) : '';
  return frac.length ? `${s}.${frac}` : s;
}

/* the flight log: start (op 10^exp) = value-at-k */
const eqFor = (d1, d2, k) => ({ op: k >= 0 ? '×' : '÷', exp: Math.abs(k) });
const eqText = (d1, d2, k) =>
  k === 0
    ? `${fmtTh(baseTh(d1, d2))} — home`
    : `${fmtTh(baseTh(d1, d2))} ${eqFor(d1, d2, k).op} 10${expStr(eqFor(d1, d2, k).exp)} = ${fmtTh(valueTh(d1, d2, k))}`;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The launch code."  A start and a target (the start
   slid k ≠ 0 columns).  Fly the digits onto the target, then pick the TRUE
   flight log from three cards: the real one, the exponent one off, and the
   operation flipped.  Provably one-true-two-false for every mission.
   ------------------------------------------------------------------------- */
function makeMission(prev) {
  let m;
  do {
    const d1 = 1 + Math.floor(Math.random() * 9);
    const d2 = Math.floor(Math.random() * 10);
    const ks = [-2, -1, 1, 2, 3];
    const k = ks[Math.floor(Math.random() * ks.length)];
    m = { d1, d2, k };
  } while (prev != null && m.d1 === prev.d1 && m.d2 === prev.d2 && m.k === prev.k);
  return m;
}
/* three log cards for a mission; card 0 is the true one */
function logCards(m) {
  const t = fmtTh(valueTh(m.d1, m.d2, m.k));
  const s = fmtTh(baseTh(m.d1, m.d2));
  const op = m.k > 0 ? '×' : '÷';
  const flip = m.k > 0 ? '÷' : '×';
  const e = Math.abs(m.k);
  return [`${s} ${op} 10${expStr(e)} = ${t}`, `${s} ${op} 10${expStr(e + 1)} = ${t}`, `${s} ${flip} 10${expStr(e)} = ${t}`];
}
const cardOrder = (m) => {
  const r = (m.d1 + m.d2 + Math.abs(m.k)) % 3;
  return [r, (r + 1) % 3, (r + 2) % 3]; // display slot -> card id
};
const calibChecks = (k, m, pick) => [m != null && k === m.k, m != null && pick != null && cardOrder(m)[pick] === 0];
const isCalibrated = (k, m, pick) => calibChecks(k, m, pick).every(Boolean);
const closeness = (k, m, pick) => {
  const c = calibChecks(k, m, pick);
  return (c[0] ? 50 : 0) + (c[1] ? 50 : 0);
};

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback; the
   trap is "just add a zero".  Next gates on ANSWERED.
   allow: which buttons work; kMin/kMax: how far this step lets the digits fly.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The bolted post',
    body: 'Seven columns, one number: 2.5. The 2 sits in the ones column, the 5 in the tenths. Between them stands the post — the decimal point, bolted down.',
    allow: '',
    kMin: 0,
    kMax: 0,
    q: 'What makes the 2 in 2.5 worth 2 ones?',
    choices: ['The column it sits in', 'The point that follows it', 'Being the first digit'],
    answer: 0,
    feedback:
      'The column. A digit is worth its place, and the places are the frame — fixed, labelled, ' +
      'each worth ten times its right-hand neighbour. The post only marks WHERE ones end and ' +
      'tenths begin. Remember that it is bolted down; everything that follows depends on it.',
  },
  {
    title: 'Press ×10',
    body: 'One press. Watch the digits — both of them — slide one column left. The post does not flinch.',
    allow: 'x',
    kMin: 0,
    kMax: 1,
    q: '2.5 × 10 = ?',
    choices: ['25 — each digit slid into a column worth ten times more', '2.50 — just add a zero', '20.5'],
    answer: 0,
    feedback:
      'Twenty-five. The 2 slid from ones to tens, the 5 from tenths to ones — and a column is ' +
      'worth ten times its neighbour, so one slide IS one factor of ten. The habit’s answer, ' +
      '2.50, is drawn in slate below: an extra card, the same number. "Add a zero" was never a ' +
      'law about ten — it was a placeholder appearing, and here there is no place to hold.',
  },
  {
    title: 'The pattern of zeros',
    body: 'The Ones-digit dial is unlocked, and the tenths card is gone: start on a bare 2. Press ×10 three times and count what appears.',
    allow: 'x',
    kMin: 0,
    kMax: 3,
    q: '2 × 10³ = 2000. Where do the three zeros come from?',
    choices: [
      'They hold the three vacated columns between the 2 and the post',
      'You append one zero per ten, by rule',
      'They are part of the digit 2',
    ],
    answer: 0,
    feedback:
      'Each press vacates a column, and an empty column between the digits and the post must be ' +
      'held open — by a placeholder zero. Three presses, three vacated places, three zeros. But ' +
      'careful: start from 2.5 instead and 2.5 × 10³ = 2500 has only TWO zeros, because the ' +
      'first slide is absorbed by the 5. The exponent counts the PRESSES, always; it counts the ' +
      'zeros only when nothing sat after the point.',
  },
  {
    title: 'The exponent counts the presses',
    body: 'The Tenths-digit dial is unlocked. Start on 3.4 and read the flight log under the frame as you press.',
    allow: 'x',
    kMin: 0,
    kMax: 3,
    q: 'To get from 3.4 to 3400, how many presses of ×10?',
    choices: ['3 — and the log reads 3.4 × 10³ = 3400', '2 — one per zero', '34'],
    answer: 0,
    feedback:
      'Three: 3.4 → 34 → 340 → 3400. The log writes the whole journey as one expression, ' +
      '3.4 × 10³ — the little 3 is nothing deeper than the press count. (And note the zeros ' +
      'again: three presses, two zeros. Trust the exponent, not the zero count.)',
  },
  {
    title: '÷10 walks home',
    body: 'The other button. You are parked at 25; press ÷10 and the digits slide right, back past the post. Keep going.',
    allow: 'xd',
    kMin: -2,
    kMax: 1,
    q: '0.25 ÷ 10 = ?',
    choices: ['0.025 — every digit one column right', '0.15', '2.5 — dividing moves digits left'],
    answer: 0,
    feedback:
      'The digits slide one column right: 2 into hundredths, 5 into thousandths, and placeholder ' +
      'zeros hold the ones and tenths open — 0.025. Division by ten is the same walk in reverse, ' +
      'and ×10 then ÷10 lands you exactly home: the two buttons undo each other, press for press.',
  },
  {
    title: 'The launch code',
    body: 'A start and a target. Fly the digits onto the landing pad with ×10 and ÷10, then pick the true flight log. Both right = calibrated.',
    allow: 'xd',
    kMin: SHIFT_MIN,
    kMax: SHIFT_MAX,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PowersOfTenLab() {
  const [d1, setD1] = useState(START_D1);
  const [d2, setD2] = useState(START_D2);
  const [k, setK] = useState(0); // net shift from home
  const [lastMove, setLastMove] = useState(0); // −1, 0, +1: the arrow’s direction
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [mission, setMission] = useState(null);
  const [pick, setPick] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const pct = calib ? closeness(k, mission, pick) : 0;
  const calibrated = calib ? isCalibrated(k, mission, pick) : false;
  const checks = calib ? calibChecks(k, mission, pick) : [false, false];

  sceneRef.current = { d1, d2, k, lastMove, calib, mission, step };

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

    /* THE FRAME — seven columns, the post between col 3 and col 4 */
    const NAMES = ['thousands', 'hundreds', 'tens', 'ones', 'tenths', 'hundredths', 'thousandths'];
    const colW = Math.min(96, (W - 40) / 7.15);
    const fx = (W - colW * 7 - 10) / 2; // 10px for the post gap
    const colX = (c) => fx + c * colW + (c >= 4 ? 10 : 0);
    const postX = fx + 4 * colW + 5;

    const cardH = Math.min(64, H * 0.155);
    const yHead = H * 0.15;
    const yCards = H * 0.30;
    const yPad = yCards + cardH + 42; // the capstone landing pad
    const yValue = H * 0.78;

    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(NAMES[c], colX(c) + colW / 2, yHead);
      ctx.strokeStyle = 'rgba(28,43,58,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX(c) + 4.5, yHead + 8.5, colW - 9, yValue - yHead - 30);
    }
    /* worth-ten-times arrows between headers, the given fact */
    ctx.fillStyle = 'rgba(91,107,123,0.7)';
    ctx.font = '600 9.5px system-ui, sans-serif';
    for (let c = 1; c < 7; c++) ctx.fillText('×10 ⟵', colX(c) - (c === 4 ? 5 : 0), yHead - 14);

    /* THE BOLTED POST */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(postX, yHead + 6);
    ctx.lineTo(postX, yValue - 24);
    ctx.stroke();
    for (const by of [yHead + 14, yValue - 32]) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(postX, by, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = GOLD;
    ctx.font = 'italic 600 11px system-ui, sans-serif';
    ctx.fillText('the point — bolted down', postX, yValue - 10);
    /* the point itself, at card level */
    ctx.beginPath();
    ctx.arc(postX, yCards + cardH - 9, 4.5, 0, Math.PI * 2);
    ctx.fill();

    /* a digit card */
    const card = (c, y, d, kind, ghostRow) => {
      const x = colX(c) + 8;
      const w = colW - 16;
      const isZero = kind === 'zero';
      ctx.fillStyle = ghostRow ? 'rgba(91,107,123,0.06)' : isZero ? 'rgba(185,135,24,0.05)' : 'rgba(200,30,79,0.05)';
      ctx.strokeStyle = ghostRow ? SLATE : isZero ? GOLD : CARMINE;
      ctx.lineWidth = isZero || ghostRow ? 1.6 : 2.2;
      if (isZero || ghostRow) ctx.setLineDash([4, 4]);
      rr(x, y, w, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ghostRow ? SLATE : isZero ? GOLD : CARMINE;
      ctx.font = `700 ${Math.round(cardH * 0.52)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(d), x + w / 2, y + cardH * 0.62);
    };

    /* ---- the number, spelled in columns ----------------------------------- */
    const cols = columnsOf(S.d1, S.d2, S.k);
    for (let c = 0; c < 7; c++) if (cols[c]) card(c, yCards, cols[c].d, cols[c].kind, false);

    /* the last slide, as arrows above the significant cards */
    if (S.lastMove !== 0) {
      ctx.fillStyle = CARMINE;
      ctx.font = '700 14px system-ui, sans-serif';
      for (let c = 0; c < 7; c++) {
        if (cols[c] && cols[c].kind === 'sig') {
          ctx.fillText(S.lastMove > 0 ? '⟵ slid' : 'slid ⟶', colX(c) + colW / 2, yCards - 8);
        }
      }
    }

    /* the add-a-zero habit, refuted in slate (step 1, after the press) */
    if (S.step === 1 && S.k === 1) {
      const gy = yPad;
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('the habit says "add a zero":', colX(1), gy - 8);
      card(3, gy, S.d1, 'sig', true);
      card(4, gy, S.d2, 'sig', true);
      card(5, gy, 0, 'sig', true);
      ctx.fillStyle = SLATE;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.fillText(`= ${fmtTh(baseTh(S.d1, S.d2))} still — the same number, not ten times`, colX(3), gy + cardH + 18);
    }

    /* the landing pad — the capstone target, dashed slate outlines */
    if (S.calib && S.mission) {
      const m = S.mission;
      const tcols = columnsOf(m.d1, m.d2, m.k);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`the landing pad — target ${fmtTh(valueTh(m.d1, m.d2, m.k))}`, colX(0) + 4, yPad - 8);
      for (let c = 0; c < 7; c++) if (tcols[c]) card(c, yPad, tcols[c].d, tcols[c].kind, true);
    }

    /* ---- the value and the flight log ------------------------------------- */
    ctx.fillStyle = CARMINE;
    ctx.font = '700 22px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`= ${fmtTh(valueTh(S.d1, S.d2, S.k))}`, W / 2, yValue + 22);
    ctx.fillStyle = INK;
    ctx.font = '600 14px ui-monospace, Menlo, monospace';
    ctx.fillText(eqText(S.d1, S.d2, S.k), W / 2, yValue + 46);
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
      const m = makeMission(null);
      setMission(m);
      setD1(m.d1);
      setD2(m.d2);
      setK(0);
      setLastMove(0);
      setPick(null);
      return;
    }
    setMission(null);
    setPick(null);
    setLastMove(0);
    if (step === 0 || step === 1) {
      setD1(START_D1);
      setD2(START_D2);
      setK(0);
    } else if (step === 2) {
      setD1(2);
      setD2(0); // a bare whole digit: the zeros count the presses
      setK(0);
    } else if (step === 3) {
      setD1(3);
      setD2(4); // the 3.4 → 3400 story
      setK(0);
    } else if (step === 4) {
      setD1(2);
      setD2(5);
      setK(1); // parked at 25; the walk home goes right
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const kLo = Math.max(SHIFT_MIN, current.kMin);
  const kHi = Math.min(SHIFT_MAX, current.kMax);
  const press = (dir) => {
    const nk = k + dir;
    if (nk < kLo || nk > kHi) return;
    setK(nk);
    setLastMove(dir);
  };
  const canX = current.allow.includes('x') && k + 1 <= kHi;
  const canD = current.allow.includes('d') && k - 1 >= kLo;

  const setDial = (key, v) => {
    if (key === 'd1') setD1(clampInt(v, 1, 9));
    if (key === 'd2') setD2(clampInt(v, 0, 9));
    setLastMove(0);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const newMission = () => {
    const m = makeMission(mission);
    setMission(m);
    setD1(m.d1);
    setD2(m.d2);
    setK(0);
    setLastMove(0);
    setPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const order = mission ? cardOrder(mission) : [0, 1, 2];
  const cards = mission ? logCards(mission) : [];
  const onTarget = mission != null && k === mission.k;

  const spoken = `The number reads ${fmtTh(valueTh(d1, d2, k))}; ${
    k === 0 ? 'it is parked at home' : `the flight log reads ${eqText(d1, d2, k)}`
  }.${calibrated ? ' Calibrated.' : ''}`;

  return (
    <div className="ptlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Powers of Ten: The Digits Slide</h1>
        <p className="lede">
          Press <span className="mono">×10</span> and every digit marches one column left — past a
          decimal point that <em>never moves</em>. The zeros are placeholders, and the exponent is
          nothing deeper than a count of presses.
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

          <div className="toolbar">
            <button type="button" className="btn times" onClick={() => press(1)} disabled={!canX}>
              × 10
            </button>
            <button type="button" className="btn ghost" onClick={() => press(-1)} disabled={!canD}>
              ÷ 10
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
            {!calib &&
              DIALS.map((d) => {
                const unlocked = step >= d.unlock;
                const v = d.key === 'd1' ? d1 : d2;
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
                      {unlocked ? v : '🔒'}
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

          {calib && mission && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The launch code</span>
                <p className="patient mono">
                  {fmtTh(baseTh(mission.d1, mission.d2))} ⟶ {fmtTh(valueTh(mission.d1, mission.d2, mission.k))}
                </p>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} digits parked on the landing pad</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the true flight log picked</li>
                </ol>
                <span className="target-hint mono">
                  {!checks[0]
                    ? 'fly the digits first'
                    : pick == null
                      ? 'now log the flight'
                      : checks[1]
                        ? 'a true log'
                        : 'not that log — New mission to retry'}
                </span>
              </div>
              <div className="cards">
                {order.map((cardId, slot) => {
                  const isPicked = pick === slot;
                  const isTrue = cardId === 0;
                  let cls = 'logcard';
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
                      disabled={!onTarget || pick != null}
                      onClick={() => setPick(slot)}
                    >
                      {cards[cardId]}
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
                  <span className="mono target-hint">fly · land · log</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newMission}>
                New mission
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
                  setD1(START_D1);
                  setD2(START_D2);
                  setK(0);
                  setLastMove(0);
                  setMission(null);
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
        <span className="mono">the digits slide ⇒ the point stays</span> &nbsp;·&nbsp; explain
        patterns in the number of zeros and in the placement of the decimal point when a number
        meets a power of 10; use whole-number exponents to denote those powers (CCSS 5.NBT.A.2).
        One press, one column, one factor of ten.
      </footer>

      <style jsx>{`
        .ptlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
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
        .btn.times {
          background: var(--carmine);
          border-color: var(--carmine);
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
          grid-template-columns: 96px 1fr 40px;
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
          font-size: 17px;
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
          gap: 8px;
        }
        .logcard {
          font: 700 13.5px/1.3 var(--mono);
          padding: 10px 8px;
          border: 2px solid rgba(28, 43, 58, 0.25);
          border-radius: 8px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .logcard:not(:disabled):hover {
          border-color: var(--ink);
        }
        .logcard:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }
        .logcard.correct {
          border-color: var(--ok);
          background: rgba(31, 138, 91, 0.08);
          opacity: 1;
        }
        .logcard.wrong {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.07);
          opacity: 1;
        }
        .logcard.dim {
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
        :global(.ptlab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .logcard {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
