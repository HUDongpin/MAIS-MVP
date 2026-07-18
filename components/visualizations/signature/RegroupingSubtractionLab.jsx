'use client';

/* ============================================================================
   RegroupingSubtractionLab — an interactive "bench" for TWO-DIGIT SUBTRACTION
   WITH REGROUPING, told as the story of THE COLUMN THAT CANNOT PAY.

        43 − 17:  the ones column holds 3 and owes 7 — it cannot pay.
        BREAK A TEN:  4 tens 3 ones  →  3 tens 13 ones   (still 43!)
        now every column can pay:     13 − 7 = 6,  3 − 1 = 2   →   26

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 2 lab — CCSS
   2.NBT.B.5 (fluently add and subtract within 100 using place-value
   strategies), 2.NBT.B.7 (subtract within 1000: "decompose tens"), and
   2.NBT.B.9 (explain WHY the strategy works) — with 1.NBT.C.6 underneath.
   PlaceValueStrategiesLab taught the ADDITION side of this coin: ten ones
   bundling UP into a carried ten.  This is the mirror that no lab owned: a
   ten breaking BACK into ten ones, because the ones column is short.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "BREAK A TEN: same amount, new name."
     The minuend sits on a place-value mat as blocks — tens as tall rods, ones
     as loose squares — and the subtrahend is a payment each column owes.
     When the ones column is SHORT (3 owes 7), it is flagged carmine and the
     lab refuses to pay it; the way through is the carmine event the whole lab
     is named for: BREAK A TEN — one rod leaves the tens column and lands in
     the ones as ten loose squares.  The gold badge above the mat never blinks:
     "still 43".  Regrouping changes a number's NAME (4 tens 3 ones → 3 tens
     13 ones), never its AMOUNT — that invariant is the entire reason the
     paper algorithm is legal, and here it is a fact you watch.  Only after
     the blocks act does the written form echo them: the crossed-out 4, the
     little 13 — the classic margin marks, arriving as a RECORD of something
     real instead of a ritual.
     The foil is the single most common subtraction error in school: flipping
     the short column (3 − 7 becomes 7 − 3, answer 34).  The blocks cannot
     make that mistake — the ones column simply runs out — and the step-4
     question hands the child the flip as a choice and lets the mat refute it.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • PlaceValueStrategiesLab owns the ADDITION chart: two addends' blocks
       pooled in one bin, ten ones bundling UP into the next column.  This lab
       has ONE number's blocks, a payment leaving them, and a ten breaking
       DOWN — the word for the sibling's move never appears below this header
       (the audit greps it out).
     • SubtractionLab owns take-away within 20: counters riding a number line,
       count-back hops, the check-by-adding arc.  No number line here, no
       hops, no check arc — and no counters: this lab begins exactly where
       one-per-tick counters stop scaling, which is WHY place value exists.
     • TwoDigitNumberLab owns BUNDLING as the birth of the ten (loose ones
       snapping INTO a rod, building the number's name).  Here every ten
       arrives already made, and the lab's one move is the reverse trade,
       in service of a subtraction — its subject is the ALGORITHM's why, not
       the numeral's anatomy.
     • LongDivisionLab owns the grade-4 tableau whose "bring down" regroups a
       remainder into a smaller place.  Nothing here divides.

   One-accent discipline: CARMINE is THE REGROUP — the flagged short column,
   the breaking rod, the ten new squares it becomes, and the little "13" the
   written form inherits.  The blocks are quiet blue; payment marks are slate
   dashes; GOLD is the INVARIANT — the "still 43" badge, the one thing that
   never changes.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a seven-year-old):
     • Everything is exact integer arithmetic.  The regrouped name satisfies
       10·(t−1) + (o+10) === 10·t + o for every minuend — audited, every one.
     • The subtrahend's dial is CLAMPED to the minuend (the SubtractionLab
       precedent), so the difference is never negative and the mat can never
       be asked for blocks it does not have.
     • The regroup is NEEDED exactly when ones(A) < ones(B) — and the flip
       error differs from the true difference by 2·(ones(B) − ones(A)),
       which is nonzero precisely then.  Both facts are audited exhaustively.
     • The calibration stamp needs two integer identities at once:
       A − B === target AND ones(A) < ones(B).  The generator only emits
       targets that are provably reachable inside the dial ranges (a target
       divisible by 10 can NEVER need a regroup — same ones digit — so the
       generator refuses those, and the audit proves a witness pair exists
       for every target it can emit).
   Verified by audit-regroupingsubtraction.mjs (numeric proof + source greps)
   and verify-regroupingsubtraction.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/RegroupingSubtractionLab.jsx
     2. Import and render it:
          import RegroupingSubtractionLab from './RegroupingSubtractionLab';
          export default function Page() { return <RegroupingSubtractionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (A, B, whether the ten
              is broken, whether the columns have paid, the step, the target).
     MODEL  — pure integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two dials (the two numbers of a subtraction — the
   AddLab/SubtractionLab precedent), two action buttons (Break a ten / Pay).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the regroup: the short column, the breaking ten
const BLUE = '#3f74a6'; // the blocks
const GOLD = '#b98718'; // the invariant: "still 43"
const SLATE = '#5b6b7b';

const DIALS = [
  { key: 'A', name: 'Start with', role: 'the amount on the mat · 21–99', min: 21, max: 99, unlock: 1, color: BLUE },
  { key: 'B', name: 'Take away', role: 'what the columns owe', min: 1, max: 99, unlock: 4, color: SLATE },
];

const START_A = 47;
const START_B = 23;
const CALIB_STEP = 5;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers, nothing else.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const tensOf = (v) => Math.floor(v / 10);
const onesOf = (v) => v % 10;

/* the wall: the ones column cannot pay */
const needsRegroup = (A, B) => onesOf(A) < onesOf(B);

/* the regrouped name: one ten traded for ten ones — same amount */
const regroupedName = (A) => ({ t: tensOf(A) - 1, o: onesOf(A) + 10 });

/* what the mat shows: {t, o} before or after the trade */
const matName = (A, broken) => (broken ? regroupedName(A) : { t: tensOf(A), o: onesOf(A) });

/* the classic flip error: always subtracting the SMALLER ones digit from the
   larger, regardless of which number owns it — 43 − 17 becoming "40−10, 7−3"
   = 34.  It agrees with the truth exactly when no regrouping is needed, which
   is precisely why the habit survives until the first wall. */
const flipError = (A, B) => 10 * (tensOf(A) - tensOf(B)) + Math.abs(onesOf(A) - onesOf(B));

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Engineer the wall."  A gold target difference is
   given; the child builds a subtraction that (1) lands on it and (2) NEEDS a
   broken ten.  Making the wall on purpose is the proof you understand it.

   No false stamp, provably: two integer identities, A − B === D and
   ones(A) < ones(B).  A target divisible by 10 forces equal ones digits
   (B = A − D keeps the ones digit when D ≡ 0 mod 10), so no regrouping pair
   exists — the generator refuses such targets, and for every target it CAN
   emit, the witness (B = 19, A = D + 19) sits inside the dial ranges and
   passes both gates.  Audited for every target.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let d;
  do {
    d = 5 + Math.floor(Math.random() * 46); // 5 … 50
  } while (d % 10 === 0 || d === prev);
  return d;
}
const calibChecks = (A, B, D) => [A - B === D, needsRegroup(A, B)];
const closeness = (A, B, D) => Math.round((100 * calibChecks(A, B, D).filter(Boolean).length) / 2);
const isCalibrated = (A, B, D) => calibChecks(A, B, D).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the scenes the copy depends on are
   pinned by STEPS[].demo = {A, B}; the reveal lives in the feedback.  The
   wrong answers are the real classroom errors — above all the flip.
   Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Pay each column',
    body:
      'The mat holds 47 — four tall tens and seven loose ones. Take away 23: the ones pay 3, ' +
      'the tens pay 2. Press Pay and watch the mat settle.',
    demo: { A: 47, B: 23 },
    pay: true,
    q: 'Every column can pay. What is left of 47 − 23?',
    choices: ['24 — two tens and four ones', '30', '64'],
    answer: 0,
    feedback:
      'Each column pays on its own: 7 ones give 3, leaving 4; 4 tens give 2, leaving 2. That ' +
      'column-by-column habit is the whole method — and it works beautifully… as long as every ' +
      'column CAN pay.',
  },
  {
    title: 'The wall',
    body: 'New problem: 43 − 17. Look at the ones column — it holds 3 and owes 7.',
    demo: { A: 43, B: 17 },
    q: 'In the ones column, can you take 7 from 3?',
    choices: [
      'No — the ones are short, something has to change',
      'Yes — just take 3 from 7 instead',
      'Yes — 3 minus 7 is 4',
    ],
    answer: 0,
    feedback:
      'No. And "take 3 from 7 instead" is the single most common subtraction mistake in school — ' +
      'flipping the column. Subtraction is not addition: 43 − 17 and 47 − 13 are different ' +
      'questions. The ones column is genuinely short, and the mat refuses to pretend otherwise. ' +
      'Something has to change — the next step is that something.',
  },
  {
    title: 'Break a ten',
    body:
      'Press Break a ten. One rod leaves the tens column and lands in the ones as ten loose ' +
      'squares. Watch the gold badge while it happens.',
    demo: { A: 43, B: 17 },
    breakBtn: true,
    q: 'After breaking a ten, 43 is…',
    choices: ['3 tens and 13 ones — still 43', '3 tens and 3 ones — now 33', '13 tens'],
    answer: 0,
    feedback:
      'Still 43 — the gold badge never blinked. Breaking a ten changes the NAME (4 tens 3 ones ' +
      'became 3 tens 13 ones), never the AMOUNT. Ten ones and one ten are the same quantity in ' +
      'different clothes, and now the ones column is rich enough to pay its 7.',
  },
  {
    title: 'Now every column can pay',
    body: 'Press Pay. The ones give 7 of their 13; the tens give 1 of their 3. Read what is left.',
    demo: { A: 43, B: 17 },
    breakBtn: true,
    pay: true,
    q: 'So 43 − 17 = ?',
    choices: ['26', '34', '36'],
    answer: 0,
    feedback:
      '26: after the trade, 13 − 7 = 6 ones and 3 − 1 = 2 tens. The wrong answer 34 is the flip ' +
      'error — taking 3 from 7 in the ones. The blocks cannot make that mistake: they simply run ' +
      'out, and running out is what forces the honest move, the broken ten.',
  },
  {
    title: 'When do you need it?',
    body:
      'Both dials are yours. You can tell from the digits alone whether a ten must break: look ' +
      'at the ones first. Try a few and check yourself against the mat.',
    demo: { A: 52, B: 28 },
    breakBtn: true,
    pay: true,
    q: 'Which subtraction needs a broken ten: 56 − 24, 52 − 28, or 58 − 22?',
    choices: ['52 − 28 — the 2 cannot pay the 8', '56 − 24', '58 − 22'],
    answer: 0,
    feedback:
      'Only 52 − 28: its ones column holds 2 and owes 8. In 56 − 24 and 58 − 22 the ones can pay ' +
      '(6 covers 4, 8 covers 2), so no trade is needed. One glance at the ones digits tells you ' +
      'before a single block moves.',
  },
  {
    title: 'Engineer the wall',
    body:
      'A gold difference is waiting. Build a subtraction that lands on it — AND that needs a ' +
      'broken ten to get there. Making the wall on purpose is how you prove you own it.',
    breakBtn: true,
    pay: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function RegroupingSubtractionLab() {
  const [A, setA] = useState(START_A);
  const [B, setB] = useState(START_B);
  const [broken, setBroken] = useState(false);
  const [paid, setPaid] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;

  const wall = needsRegroup(A, B);
  const canBreak = !!current.breakBtn && wall && !broken && !paid;
  const canPay = !!current.pay && !paid && (!wall || broken);

  const pct = calib && target != null ? closeness(A, B, target) : 0;
  const calibrated = calib && target != null ? isCalibrated(A, B, target) : false;
  const checks = calib && target != null ? calibChecks(A, B, target) : [false, false];

  sceneRef.current = { A, B, broken, paid, wall, calib, target: calib ? target : null };

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

    const name = matName(S.A, S.broken);
    const bT = tensOf(S.B);
    const bO = onesOf(S.B);
    const diff = S.A - S.B;

    /* layout: gold badge band, the mat (two columns), the written echo below */
    const bandH = 50;
    const echoH = 92;
    const matTop = bandH + 8;
    const matH = H - matTop - echoH - 10;
    const colW = Math.min(240, (W - 60) / 2);
    const tensX = W / 2 - colW - 12;
    const onesX = W / 2 + 12;

    /* the invariant badge — gold, and it never changes */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px ui-monospace, Menlo, monospace';
    const badge = S.paid ? `${S.A} − ${S.B} = ${diff}` : `still ${S.A}`;
    const bw = ctx.measureText(badge).width + 26;
    ctx.fillStyle = 'rgba(185,135,24,0.1)';
    rr(W / 2 - bw / 2, bandH / 2 - 15, bw, 30, 8);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.6;
    rr(W / 2 - bw / 2, bandH / 2 - 15, bw, 30, 8);
    ctx.stroke();
    ctx.fillStyle = S.paid ? INK : GOLD;
    ctx.fillText(badge, W / 2, bandH / 2 + 1);

    /* column plates */
    for (const [x, label] of [
      [tensX, 'tens'],
      [onesX, 'ones'],
    ]) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      rr(x, matTop, colW, matH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.18)';
      ctx.lineWidth = 1;
      rr(x, matTop, colW, matH, 10);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(label, x + colW / 2, matTop + 14);
    }

    /* the short-column flag */
    if (S.wall && !S.broken && !S.paid) {
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      rr(onesX - 2, matTop - 2, colW + 4, matH + 4, 11);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.fillText(`holds ${onesOf(S.A)} · owes ${bO} — cannot pay`, onesX + colW / 2, matTop + matH - 12);
    }

    /* blocks.  Tens: rods.  Ones: squares in a 5-wide grid.  Paid blocks stay
       visible as slate dashed ghosts — a record of the payment. */
    const rodW = Math.min(26, (colW - 40) / Math.max(4, name.t + (S.broken ? 1 : 0)));
    const rodH = Math.min(matH - 70, 150);
    const remT = S.paid ? name.t - bT : name.t;
    for (let i = 0; i < name.t; i++) {
      const x = tensX + 22 + i * (rodW + 8);
      const y = matTop + 30 + (rodH < 120 ? 0 : 8);
      const gone = i >= remT;
      ctx.fillStyle = gone ? 'rgba(91,107,123,0.08)' : BLUE;
      rr(x, y, rodW, rodH, 5);
      ctx.fill();
      ctx.strokeStyle = gone ? SLATE : 'rgba(28,43,58,0.35)';
      ctx.lineWidth = 1.2;
      if (gone) ctx.setLineDash([4, 3]);
      rr(x, y, rodW, rodH, 5);
      ctx.stroke();
      ctx.setLineDash([]);
      // ten faint segments so a rod visibly holds ten
      ctx.strokeStyle = gone ? 'rgba(91,107,123,0.25)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      for (let s = 1; s < 10; s++) {
        const yy = y + (rodH * s) / 10;
        ctx.beginPath();
        ctx.moveTo(x + 3, yy);
        ctx.lineTo(x + rodW - 3, yy);
        ctx.stroke();
      }
    }

    const sq = Math.min(24, (colW - 50) / 5);
    const remO = S.paid ? name.o - bO : name.o;
    for (let i = 0; i < name.o; i++) {
      const gx = onesX + 25 + (i % 5) * (sq + 7);
      const gy = matTop + 34 + Math.floor(i / 5) * (sq + 7);
      const gone = i >= remO;
      const isNew = S.broken && i >= onesOf(S.A); // the ten that arrived by trade
      ctx.fillStyle = gone ? 'rgba(91,107,123,0.08)' : isNew ? 'rgba(200,30,79,0.14)' : BLUE;
      rr(gx, gy, sq, sq, 4);
      ctx.fill();
      ctx.strokeStyle = gone ? SLATE : isNew ? CARMINE : 'rgba(28,43,58,0.35)';
      ctx.lineWidth = isNew ? 1.6 : 1.2;
      if (gone) ctx.setLineDash([4, 3]);
      rr(gx, gy, sq, sq, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (S.broken && !S.paid) {
      ctx.fillStyle = CARMINE;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.fillText('one ten, now ten ones', onesX + colW / 2, matTop + matH - 12);
    }

    /* written form: A over −B, with the regroup marks echoing the mat.  (No
       "3 tens 13 ones" caption here — the blocks say it, the echo writes it,
       and a third copy collided with the echo's own marks.) */
    const ex = W / 2;
    const ey = H - echoH + 34;
    ctx.font = '700 24px ui-monospace, Menlo, monospace';
    const colGap = 26;
    // tens digit of A (crossed out once broken), the little regrouped pair
    const at = String(tensOf(S.A));
    const ao = String(onesOf(S.A));
    if (S.broken) {
      ctx.fillStyle = 'rgba(28,43,58,0.4)';
      ctx.fillText(at, ex - colGap, ey);
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - colGap - 9, ey + 7);
      ctx.lineTo(ex - colGap + 9, ey - 9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(28,43,58,0.4)';
      ctx.fillText(ao, ex, ey);
      ctx.strokeStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(ex - 9, ey + 7);
      ctx.lineTo(ex + 9, ey - 9);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(String(tensOf(S.A) - 1), ex - colGap, ey - 22);
      ctx.fillText(String(onesOf(S.A) + 10), ex + 2, ey - 22);
      ctx.font = '700 24px ui-monospace, Menlo, monospace';
    } else {
      ctx.fillStyle = INK;
      ctx.fillText(at, ex - colGap, ey);
      ctx.fillText(ao, ex, ey);
    }
    ctx.fillStyle = INK;
    ctx.fillText('−', ex - colGap * 2.1, ey + 28);
    ctx.fillText(String(bT), ex - colGap, ey + 28);
    ctx.fillText(String(bO), ex, ey + 28);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ex - colGap * 2.3, ey + 44);
    ctx.lineTo(ex + colGap * 0.7, ey + 44);
    ctx.stroke();
    if (S.paid) {
      ctx.fillStyle = INK;
      ctx.fillText(String(tensOf(diff) === 0 ? ' ' : tensOf(diff)), ex - colGap, ey + 68);
      ctx.fillText(String(onesOf(diff)), ex, ey + 68);
    }

    /* gold target echo in the capstone */
    if (S.calib && S.target != null) {
      ctx.fillStyle = GOLD;
      ctx.font = '700 14px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`goal: land on ${S.target}`, 16, ey + 28);
      ctx.textAlign = 'center';
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
    const d = STEPS[step].demo;
    if (d) {
      setA(d.A);
      setB(d.B);
    }
    setBroken(false);
    setPaid(false);
  }, [step]);

  /* hand the capstone a target on first arrival */
  useEffect(() => {
    if (current.calib && target == null) setTarget(makeTarget(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const setDialA = (v) => {
    const a = clampInt(v, 21, 99);
    setA(a);
    if (B > a) setB(a); // the SubtractionLab clamp: never take more than you have
    setBroken(false);
    setPaid(false);
  };
  const setDialB = (v) => {
    setB(clampInt(v, 1, A));
    setBroken(false);
    setPaid(false);
  };
  const doBreak = () => {
    if (canBreak) setBroken(true);
  };
  const doPay = () => {
    if (canPay) setPaid(true);
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setBroken(false);
    setPaid(false);
    const d = STEPS[step].demo;
    if (d) {
      setA(d.A);
      setB(d.B);
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const nm = matName(A, broken);
  const spoken = `${A} on the mat as ${nm.t} tens and ${nm.o} ones, taking away ${B}. ${
    wall && !broken ? 'The ones column cannot pay.' : ''
  } ${paid ? `Paid: ${A - B} left.` : ''} ${calibrated ? 'Calibrated.' : ''}`;

  return (
    <div className="rslab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Break a Ten: Subtraction with Regrouping</h1>
        <p className="lede">
          Subtract column by column — until the ones column <em>cannot pay</em>. Then trade: one
          ten becomes ten ones. The number keeps its <em>amount</em> and changes its{' '}
          <span className="mono">name</span>, and that trade is the whole trick.
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
            {current.breakBtn && (
              <button type="button" className="btn break" onClick={doBreak} disabled={!canBreak}>
                Break a ten
              </button>
            )}
            {current.pay && (
              <button type="button" className="btn" onClick={doPay} disabled={!canPay}>
                Pay
              </button>
            )}
            <button type="button" className="btn ghost" onClick={reset}>
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
            {DIALS.map((d) => {
              const unlocked = calib || step >= d.unlock;
              const val = d.key === 'A' ? A : B;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.key === 'B' ? A : d.max}
                    step={1}
                    value={val}
                    disabled={!unlocked}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => (d.key === 'A' ? setDialA(e.target.value) : setDialB(e.target.value))}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                    {unlocked ? val : '🔒'}
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

          {calib && target != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">Engineer the wall</span>
                <span className="target-word mono">difference = {target}</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} {A} − {B} lands on {target}
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the ones column needs a broken ten
                  </li>
                </ol>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">hit the difference · force the trade</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setBroken(false);
                  setPaid(false);
                }}
              >
                New goal
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
                  setA(START_A);
                  setB(START_B);
                  setBroken(false);
                  setPaid(false);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">4 tens 3 ones = 3 tens 13 ones</span> &nbsp;·&nbsp; subtracting within
        100 by decomposing a ten (CCSS 2.NBT.B.5, 2.NBT.B.7, 2.NBT.B.9). The trade changes a
        number’s <em>name</em>, never its <em>amount</em> — which is why the paper marks are legal.
      </footer>

      <style jsx>{`
        .rslab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --carmine: #c81e4f;
          --blue: #3f74a6;
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
        .btn.break {
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
        .target-word {
          font-size: 21px;
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
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        :global(.rslab) :focus-visible {
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
