'use client';

/* ============================================================================
   NumberBondLab — an interactive "bench" for NUMBER BONDS / DECOMPOSING ≤ 10.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This sits alongside
   CountingLab as the youngest tier of the library — CCSS K.OA.A.3 (decompose
   numbers less than or equal to 10 into pairs in more than one way, and RECORD
   each decomposition with an equation) and K.OA.A.4 (for any number 1–9, find
   the number that makes 10).  It also feeds 1.OA.B.3 and 1.OA.C.6.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated on
   ANSWERED (not correct), and a calibration challenge with a live match meter
   and a CALIBRATED stamp that is provably impossible to fire falsely.

   ---------------------------------------------------------------------------
   WHY THIS LAB EXISTS AND WHAT IT REFUSES TO DO  (read before editing)
   ---------------------------------------------------------------------------
   This is the most crowded corner of the whole library.  Before designing it,
   the neighbours were surveyed, and each one already owns a device:

     AddLab            the number line, "count-on" hops, unit rods, the
                       Swap a/b button, and a "build N" construction goal.
     SubtractionLab    counters riding a number line, take-away, and the
                       missing-part (unknown-addend) hunt.
     CountingLab       the TEN-FRAME, one-to-one correspondence, cardinality.
     CommutativeLab    the turn-around, as a button.
     PlaceValueLab     make-a-ten by regrouping base-ten blocks.

   So this lab may not be "addition with a picture" — that is taken.  It owns
   the one idea none of them touch:

       *** ONE WHOLE, MANY DECOMPOSITIONS — SEEN ALL AT ONCE. ***
       A fan of splits, not a walk.

   The mathematical inversion that makes it a different lab, not a re-skin:

     AddLab      : parts are the INPUT (dials a, b) → the whole is the OUTPUT.
                   Two degrees of freedom.  The whole CHANGES as you dial.
     NumberBondLab: the whole is the INPUT (dial N) → the CUT is the only
                   freedom (dial p).  ONE degree of freedom.  q = N − p is a
                   READOUT, never a dial.

   That is the whole design in one line: **there is no q dial, so there is no
   way to break the bond.**  p + q = N is not checked, not enforced, not
   validated — it is true by construction, because q is not a number the child
   can set.  Conservation of the whole is structural, not promised.  (Same
   trick as PointLab's locked y-dial: the constraint IS the mathematics.)

   THE SIGNATURE CENTERPIECE — "the counters never move; only the cut does."
   N counters sit in a fixed tray.  Sliding the cut recolours them and moves
   one carmine line.  Not one counter shifts, and the tray never changes width.
   A child watching the cut travel sees the whole hold still while the
   partition moves — which is exactly what "5 = 4+1 and 5 = 2+3" means.

   THE SECOND CENTERPIECE — THE FAN.  All N+1 splits of N at once, as N+1 rows
   of identical length, each cut one place further along.  The cut points fall
   down the page in a diagonal.  The fan carries three ideas no sibling shows:
     · COMPLETENESS — there are exactly N+1 ways, and you can see there are no
       others, because the cut has nowhere else to land.
     · THE SEESAW    — p up one, q down one, forever.
     · THE MIRROR    — the fan is symmetric top-to-bottom, so 2+3 and 3+2 are
       the same picture flipped.  **The turn-around is re-aimed onto the fan's
       symmetry instead of a Swap button**, because AddLab/CommutativeLab/
       MultiplicationLab already own that button.  You get every turn-around
       free, without swapping anything.

   THE EQUATION IS WRITTEN WHOLE-FIRST: `5 = 2 + 3`, not `2 + 3 = 5`.  This is
   the form CCSS K.OA.A.3 itself uses, and it is not cosmetic: composition
   reads left-to-right into an answer, decomposition starts from the whole and
   breaks it.  AddLab reads `a + b = sum`; this lab reads `N = p + q`.  The two
   labs teach opposite directions of the same fact and their readouts say so.

   These refusals are not left to prose — `audit-numberbond.mjs` STRIPS THIS
   FILE'S COMMENTS AND GREPS THE CODE for them.  A distinctness promise written
   only in a comment is a promise you will break on the next edit.

   KEPT DELIBERATELY SPARSE (the audience is five).  Every element on screen has
   to earn its place against "would a Kindergartener miss it?", and a first
   draft failed that test badly: it carried a four-tile facts grid, a mirrored
   second equation, a q readout in a dial slot, part-counts printed over the
   tray, and a "sweep the cut" animation — between them putting the number q on
   screen FOUR times.  All are gone.  If you are tempted to add a readout, check
   first whether the picture already says it; it usually does.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/NumberBondLab.jsx
     2. Import and render it:
          import NumberBondLab from './NumberBondLab';
          export default function Page() { return <NumberBondLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (N, p, lesson step).
     MODEL  — pure exact integer arithmetic; it knows nothing about pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 3 — World. There is no axis in this lab, on purpose: a number line is
   AddLab's and SubtractionLab's device, and it teaches ordinal position, which
   is not what a bond is about. A bond is about SET membership — which side of
   the cut a counter is on. So the "world" here is just the whole's ceiling.
   ------------------------------------------------------------------------- */
const N_MIN = 1;
const N_MAX = 10; // "decomposing ≤ 10" — the standard's own ceiling

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Exactly TWO dials, and which two is the whole design.

     N — the whole. The number being broken apart.
     p — THE CUT. Not "the first part" — the PLACE THE CUT FALLS. p happens to
         equal the size of the left part, but naming it the cut is what keeps
         the child's attention on the partition rather than on two independent
         numbers.

   There is deliberately NO q dial. q = N − p is a readout. See the header.
   p's max is clamped to the live value of N at render time (a whole of 6 has
   no cut at 7), exactly as SubtractionLab clamps its subtrahend to the
   minuend — so no unreachable or nonsense state is dialable.
   ------------------------------------------------------------------------- */
const PARAMS = [
  { key: 'N', label: 'N', min: N_MIN, max: N_MAX, step: 1, unlock: 1, role: 'the whole · the number you break apart' },
  { key: 'p', label: 'p', min: 0, max: N_MAX, step: 1, unlock: 2, role: 'the cut · where the whole splits' },
];

/* 5 = 2 + 3 — the literal example printed in CCSS K.OA.A.3. */
const START = { N: 5, p: 2 };

const CUT_STEP = 2; // p unlocks here; tap-the-tray also turns on here
const FAN_STEP = 4; // the fan opens here — all the ways, at once
const TEN_STEP = 5; // partners of ten (K.OA.A.4); the whole is set to 10 here
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. Pure math, no pixels. Every value here is an exact integer;
   nothing is approximated, so nothing can drift.
   ------------------------------------------------------------------------- */

/* The other part. This single line is the reason the lab is correct: q is
   COMPUTED, never stored and never dialed, so p + q === N can never fail. */
function otherPart(N, p) {
  return N - p;
}

/* Every ordered bond of N: (p, N−p) for p = 0 … N. Ordered, because K.OA.A.3
   records 5 = 2 + 3 and 5 = 3 + 2 as two different equations — and because the
   ORDER is what makes the fan a mirror. There are exactly N + 1 of them. */
function bondsOf(N) {
  const out = [];
  for (let p = 0; p <= N; p++) out.push([p, N - p]);
  return out;
}

/* The count of ways — a real theorem for a five-year-old: N + 1, because the
   cut has N + 1 places to land (before the 1st counter, between each adjacent
   pair, and after the last). */
function bondCount(N) {
  return N + 1;
}

/* K.OA.A.4 — the partner that makes ten. */
function partnerOfTen(p) {
  return 10 - p;
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the dial unlocks with the step; the
   reveal lives in `feedback` (shown only after answering); every distractor is
   a real early-learner misconception — reading a bond as a question, thinking
   the tray is always ten, failing to conserve the whole when the cut moves,
   refusing zero as a part, and "turn-arounds don't count".
   Next is gated on ANSWERED, never on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the number bond',
    body: 'The top circle is the whole: 5. Its two parts hang below: 2 and 3.',
    q: 'What does the top circle show?',
    choices: ['The whole', 'The answer', 'The bigger part'],
    answer: 0,
    feedback: 'The whole. 5 = 2 + 3 says “five is made of two and three.”',
  },
  {
    title: 'N — the whole',
    body: 'Drag the N dial. The tray grows and shrinks with it.',
    q: 'If N = 8, how many counters are in the tray?',
    choices: ['8 — the whole', '2 — one per part', '10 — always ten'],
    answer: 0,
    feedback: 'N = 8 puts 8 counters in the tray. The tray is not always ten.',
  },
  {
    title: 'p — the cut',
    body: 'Slide the cut between the counters. The counters never move.',
    q: '6 = 2 + 4. Slide the cut to 3. Now what?',
    choices: ['6 = 3 + 3', '6 = 3 + 4', '6 = 3 + 5'],
    answer: 0,
    feedback: 'One part up, one part down. 2 + 4 and 3 + 3 both make 6.',
  },
  {
    title: 'Reading a bond',
    body: 'Read it whole first: “five is two and three.” Try a few cuts.',
    q: 'Which is a TRUE bond for 7?',
    choices: ['7 = 0 + 7', '7 = 3 + 5', '7 = 7 + 7'],
    answer: 0,
    feedback: 'Zero can be a part! 3 + 5 makes 8, not 7.',
  },
  {
    title: 'The fan — every way at once',
    body: 'Every row is the same whole, cut in a different place. Move your cut.',
    q: 'How many ways can 5 be cut?',
    choices: ['6 ways', '5 ways', '3 ways'],
    answer: 0,
    feedback: '6 spots for the cut, 0 through 5. The fan shows all of them.',
  },
  {
    title: 'The partners of ten',
    body: 'The whole is 10 now. The gold fan shows every partner pair.',
    q: 'What is 7’s partner to ten?',
    choices: ['3 — because 7 + 3 = 10', '17', '4'],
    answer: 0,
    feedback: '7 + 3 = 10. Partners make 8 + 5 easy: 8 + 2 = 10, then 3 more is 13.',
  },
  {
    title: 'Be a bond collector',
    body: 'Move the cut. Record each new bond. Fill every row!',
    calib: true,
  },
];

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's sanctioned
   alternative to curve-matching; precedent CubeLab / AddLab / SubtractionLab).

   The game had to be chosen carefully, because the obvious ones are taken:
     · "hit a target total"      → that is AddLab's capstone, exactly.
     · "find the missing part"   → that is SubtractionLab's capstone, exactly.
   So this lab's capstone is the one thing only it can ask: COMPLETENESS.
   Collect the ENTIRE bond family of N — which is K.OA.A.3's literal verb
   ("record each decomposition") and its literal demand ("in more than one way").

   The meter measures how much of the family you have recorded. It CANNOT fire
   falsely, and the proof is that it does not compare anything to a tolerance:
   `recorded` is a list of distinct integer cut positions, each one clamped by
   construction to [0, N]. The stamp needs recorded.length === N + 1 with all
   entries distinct and in range — i.e. literally every cut position. There is
   no rounding, no epsilon, no float. Miss one row and it reads N/(N+1), never
   100%.

   During calibration the fan goes blank and the whole is locked, so the only
   live control is the cut. The lesson may show you the family; the challenge
   makes you find it.
   ------------------------------------------------------------------------- */
const matchPercent = (recorded, N) =>
  N == null ? 0 : (100 * recorded.length) / bondCount(N);

const isCalibrated = (recorded, N) => {
  if (N == null) return false;
  if (recorded.length !== bondCount(N)) return false;
  if (new Set(recorded).size !== recorded.length) return false; // distinct
  return recorded.every((v) => Number.isInteger(v) && v >= 0 && v <= N); // in range
};

/* Targets 4 … 10 → a family of 5 … 11 bonds. Small enough to finish, big
   enough that you must keep track of what you already have. */
function makeTarget(prev) {
  let N;
  do {
    N = 4 + Math.floor(Math.random() * 7); // 4 … 10
  } while (prev != null && N === prev);
  return N;
}

/* ---------------------------------------------------------------------------
   Formatting helpers.
   ------------------------------------------------------------------------- */
const numToWord = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
];
const word = (n) => numToWord[n] ?? String(n);

/* EDIT 5 — Equation display. WHOLE FIRST: N = p + q. The colours are the same
   ones the picture uses, so symbol and drawing are one object: the whole in
   neutral ink (it is the constant), the cut-side part in carmine (the accent —
   the thing being taught), the remainder in blue. */
function BondEquation({ N, p, q }) {
  return (
    <span className="eq">
      <span className="t-whole">{N}</span>
      <span className="t-op">&nbsp;=&nbsp;</span>
      <span className="t-p">{p}</span>
      <span className="t-op">&nbsp;+&nbsp;</span>
      <span className="t-q">{q}</span>
    </span>
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function NumberBondLab() {
  const [N, setN] = useState(START.N);
  const [p, setP] = useState(START.p);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null);
  const [recorded, setRecorded] = useState([]); // distinct cut positions found
  const [note, setNote] = useState(null); // 'new' | 'dup' — transient record feedback
  const [fanOpen, setFanOpen] = useState(false);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoverRef = useRef(null); // cut position under the pointer, or null
  const geomRef = useRef(null); // tray geometry, published by draw() for hit-testing
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const q = otherPart(N, p);
  const showFan = fanOpen || step >= FAN_STEP;
  const isTen = N === 10;

  // Snapshot everything the renderer needs, so draw() (a stable callback) and
  // the pointer/animation handlers never read stale values.
  sceneRef.current = {
    N,
    p,
    q,
    step,
    calib,
    recorded,
    showFan,
    tenStep: step === TEN_STEP && isTen,
    cutLive: step >= CUT_STEP,
  };

  const pct = calib ? matchPercent(recorded, target) : 0;
  const calibrated = calib ? isCalibrated(recorded, target) : false;

  /* ---- full redraw from state -------------------------------------------- */
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
    const BLUE = '#3F74A6';
    const GOLD = '#D9982B';
    const CARM_SOFT = 'rgba(200,30,79,0.13)';
    const BLUE_SOFT = 'rgba(63,116,166,0.14)';
    const QUAD = 'rgba(199,216,228,0.55)';

    const S = sceneRef.current;
    const NN = S.N;
    const P = S.p;
    const Q = NN - P;

    ctx.clearRect(0, 0, W, H);

    /* ---- quadrille paper ---------------------------------------------------
       A true square grid, not an axis. This lab has no number line by design
       (see the header), so the paper is just paper. */
    ctx.lineWidth = 1;
    ctx.strokeStyle = QUAD;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 22) {
      const X = Math.round(x) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let y = 0; y <= H; y += 22) {
      const Y = Math.round(y) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.stroke();

    /* ---- layout bands (all derived from H, so it scales) ------------------- */
    const padX = 22;
    const availW = W - padX * 2;
    // One constant cell size for every whole, so a counter is always the same
    // size and N=10 exactly fills the tray. The tray's WIDTH carries N.
    const unit = Math.max(16, Math.min(44, Math.floor(availW / N_MAX)));

    const bondH = Math.round(H * (S.showFan ? 0.29 : 0.42));
    const rowH = Math.round(
      Math.max(34, Math.min(S.showFan ? 62 : 92, H * (S.showFan ? 0.15 : 0.24)))
    );
    // Room under the tray for the "the whole = N · always" brace AND its label,
    // plus clearance for the fan's caption below it. This was 30 and the two
    // labels printed straight through each other: the brace label runs to
    // rowTop+rowH+31, and the caption is drawn bottom-baselined at fanTop-6.
    // Anything under ~48 collides. (Browser QA caught this; the code reads fine.)
    const BRACE_H = 52;
    // With the fan closed there is no third band, so the bond diagram and the
    // tray are centred in the stage rather than left hanging from the top edge
    // above a void.
    const bondTop = S.showFan
      ? 6
      : Math.max(6, Math.round((H - (bondH + 4 + rowH + BRACE_H)) / 2));
    const rowTop = bondTop + bondH + 4;
    const fanTop = rowTop + rowH + BRACE_H;
    // Reserve the hint pill's strip at the bottom. The pill is absolutely
    // positioned over the canvas, so the fan must be told not to run under it:
    // at 375px the last row of the N=10 fan landed at y=365 with the pill
    // covering 360–384, hiding "10 = 10 + 0". A fan that claims 11 ways and
    // shows 10 breaks the one promise this lab makes.
    const HINT_H = 36;
    const fanH = H - fanTop - HINT_H;

    const trayW = NN * unit;
    const trayX0 = Math.round((W - trayW) / 2);
    const cutX = (v) => trayX0 + v * unit;

    /* ===== BAND 1 — the bond diagram (the canonical picture) ================
       The whole on top in neutral ink; two parts hanging below in carmine and
       blue. Ink for the whole is deliberate: the whole is the INVARIANT, and
       it should never compete with the accent for attention. */
    {
      const cx = W / 2;
      const rW = Math.max(16, Math.min(30, bondH * 0.21));
      const rP = rW * 0.86;
      const yW = bondTop + rW + 12;
      const yP = bondTop + bondH - rP - 12;
      const dx = Math.max(52, Math.min(104, W * 0.16));

      // branches (drawn first, so the circles sit on top of them)
      ctx.save();
      ctx.strokeStyle = 'rgba(28,43,58,0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - rW * 0.5, yW + rW * 0.78);
      ctx.lineTo(cx - dx + rP * 0.42, yP - rP * 0.82);
      ctx.moveTo(cx + rW * 0.5, yW + rW * 0.78);
      ctx.lineTo(cx + dx - rP * 0.42, yP - rP * 0.82);
      ctx.stroke();
      ctx.restore();

      const bubble = (x, y, r, fill, edge, text, lw) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.fillStyle = edge;
        ctx.font = `700 ${Math.round(r * 0.95)}px ui-monospace, "SF Mono", Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 0.5);
        ctx.restore();
      };

      // the whole — gold-ringed on the partners-of-ten step, ink otherwise
      const wholeEdge = S.tenStep ? GOLD : INK;
      bubble(cx, yW, rW, PAPER, wholeEdge, String(NN), S.tenStep ? 3 : 2.4);
      bubble(cx - dx, yP, rP, CARM_SOFT, CARMINE, String(P), 2);
      bubble(cx + dx, yP, rP, BLUE_SOFT, BLUE, String(Q), 2);

      // One label, naming the invariant. The two "part" labels that used to
      // hang under the part circles are gone: they sat in the same few pixels
      // as the cut's upper grip cap, which printed straight through them (the
      // left one read "art"), and the tutor names the parts anyway.
      ctx.save();
      ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('the whole', cx, yW - rW - 5);
      ctx.restore();
    }

    /* ===== BAND 2 — the split row: THE CENTERPIECE ==========================
       N counters in a fixed tray, and one carmine cut. The counters do not
       move when the cut moves — they only change side. That stillness is the
       entire pedagogical point, so nothing here may animate position. */
    {
      // the tray — the whole. Its width is N units and NEVER depends on p.
      ctx.save();
      ctx.fillStyle = 'rgba(251,251,248,0.92)';
      ctx.fillRect(trayX0, rowTop, trayW, rowH);
      ctx.strokeStyle = S.tenStep ? GOLD : 'rgba(28,43,58,0.75)';
      ctx.lineWidth = S.tenStep ? 2.6 : 2;
      ctx.strokeRect(trayX0 + 0.5, rowTop + 0.5, trayW - 1, rowH - 1);
      // faint cell divisions, so the counters read as countable units
      ctx.strokeStyle = 'rgba(28,43,58,0.10)';
      ctx.lineWidth = 1;
      for (let i = 1; i < NN; i++) {
        const X = Math.round(cutX(i)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(X, rowTop + 3);
        ctx.lineTo(X, rowTop + rowH - 3);
        ctx.stroke();
      }
      ctx.restore();

      // the counters — recoloured by side of the cut, never moved
      const rC = Math.min(unit * 0.31, rowH * 0.29);
      const yC = rowTop + rowH / 2;
      for (let i = 0; i < NN; i++) {
        const x = trayX0 + (i + 0.5) * unit;
        const left = i < P;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, yC, rC, 0, Math.PI * 2);
        ctx.fillStyle = left ? CARM_SOFT : BLUE_SOFT;
        ctx.fill();
        ctx.strokeStyle = left ? CARMINE : BLUE;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }

      // The part counts are deliberately NOT printed over each group here: the
      // bond diagram's two circles sit directly above the tray and already say
      // p and q. A five-year-old does not need the same number four times.

      // the ghost cut under the pointer (tap-to-cut affordance)
      const hv = hoverRef.current;
      if (hv != null && hv !== P && S.cutLive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cutX(hv), rowTop - 2);
        ctx.lineTo(cutX(hv), rowTop + rowH + 2);
        ctx.stroke();
        ctx.restore();
      }

      /* THE CUT — the one accent object of the whole lab. A carmine line with
         grip caps, standing in the gap between two counters. */
      {
        const X = cutX(P);
        ctx.save();
        // a paper-coloured gap so the cut reads as a real separation
        ctx.fillStyle = PAPER;
        ctx.fillRect(X - 2.5, rowTop + 1, 5, rowH - 2);
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(X, rowTop - 7);
        ctx.lineTo(X, rowTop + rowH + 7);
        ctx.stroke();
        // grip caps
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.arc(X, rowTop - 7, 3.4, 0, Math.PI * 2);
        ctx.arc(X, rowTop + rowH + 7, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // the "whole" brace under the tray — the invariant, stated every frame
      {
        const by = rowTop + rowH + 13;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(trayX0, by);
        ctx.lineTo(trayX0, by + 5);
        ctx.lineTo(trayX0 + trayW, by + 5);
        ctx.lineTo(trayX0 + trayW, by);
        ctx.stroke();
        ctx.fillStyle = INK_SOFT;
        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`the whole = ${NN}`, trayX0 + trayW / 2, by + 7);
        ctx.restore();
      }
    }

    /* ===== BAND 3 — THE FAN ================================================
       N+1 rows, every one the same length N, each cut one place further along.
       This is the picture the whole lab exists for: the family, complete, at
       once. In calibration the rows start blank and fill as they are found. */
    if (S.showFan && fanH > 40) {
      const rows = bondCount(NN);
      const labelW = 86;
      const fanUnit = Math.max(6, Math.min(unit * 0.45, Math.floor((availW - labelW - 16) / N_MAX)));
      const rowStep = Math.max(9, Math.min(20, Math.floor(fanH / (rows + 0.8))));
      const barH = Math.max(6, rowStep - 5);
      // The row equations are the RECORDING half of K.OA.A.3, so they may not
      // shrink into illegibility on a phone; the stage's mobile aspect ratio is
      // sized to keep barH (and therefore this) at a readable size.
      const rowFont = Math.max(9, Math.min(11, barH));
      const fanW = NN * fanUnit;
      const fanX0 = Math.round((W - fanW - labelW) / 2);
      const top = fanTop + Math.max(0, Math.round((fanH - rows * rowStep) / 2));

      // caption
      ctx.save();
      ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const cap = S.calib
        ? `record sheet — ${S.recorded.length} of ${rows} found`
        : `all ${rows} ways to make ${NN}`;
      ctx.fillText(cap, fanX0, fanTop - 6);
      ctx.restore();

      for (let j = 0; j < rows; j++) {
        const y = top + j * rowStep;
        const known = !S.calib || S.recorded.includes(j);
        const isCur = j === P;
        const xc = fanX0 + j * fanUnit;

        if (isCur) {
          // highlight the row the cut is on — a soft plate behind it
          ctx.save();
          ctx.fillStyle = 'rgba(28,43,58,0.055)';
          ctx.fillRect(fanX0 - 6, y - 2, fanW + labelW + 10, barH + 4);
          ctx.restore();
        }

        if (!known) {
          // a blank slot — you can see how many are missing, not which
          ctx.save();
          ctx.strokeStyle = 'rgba(91,107,123,0.55)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(fanX0 + 0.5, y + 0.5, fanW - 1, barH - 1);
          ctx.restore();
          ctx.save();
          ctx.font = `${rowFont}px ui-monospace, "SF Mono", Menlo, monospace`;
          ctx.fillStyle = 'rgba(91,107,123,0.75)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${NN} = ? + ?`, fanX0 + fanW + 10, y + barH / 2);
          ctx.restore();
          continue;
        }

        // the bar: carmine [0, j] then blue [j, N] — the same colours as the tray
        ctx.save();
        if (j > 0) {
          ctx.fillStyle = CARM_SOFT;
          ctx.fillRect(fanX0, y, j * fanUnit, barH);
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(fanX0 + 0.5, y + 0.5, j * fanUnit - 1, barH - 1);
        }
        if (j < NN) {
          ctx.fillStyle = BLUE_SOFT;
          ctx.fillRect(xc, y, (NN - j) * fanUnit, barH);
          ctx.strokeStyle = BLUE;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(xc + 0.5, y + 0.5, (NN - j) * fanUnit - 1, barH - 1);
        }
        // the cut mark — these are what form the diagonal down the page
        ctx.strokeStyle = S.tenStep ? GOLD : CARMINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xc, y - 2);
        ctx.lineTo(xc, y + barH + 2);
        ctx.stroke();
        ctx.restore();

        // the recorded equation — whole first, always
        ctx.save();
        ctx.font = `${isCur ? '700 ' : ''}${rowFont}px ui-monospace, "SF Mono", Menlo, monospace`;
        ctx.fillStyle = S.tenStep ? GOLD : isCur ? INK : INK_SOFT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${NN} = ${j} + ${NN - j}`, fanX0 + fanW + 10, y + barH / 2);
        ctx.restore();
      }
    }

    // publish the tray geometry so the pointer handlers can hit-test it
    geomRef.current = { trayX0, trayY: rowTop, trayH: rowH, unit, N: NN };
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [N, p, step, target, recorded, showFan, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* The partners-of-ten step is ABOUT ten, so it sets the whole to ten on
     arrival. The dial stays live — a child may still wander off to another
     whole, and the gold simply switches off when they do. */
  useEffect(() => {
    if (step === TEN_STEP) setN(10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* Hand a target to the calibration step the first time we reach it, and
     clear the record sheet so it starts honestly empty. */
  useEffect(() => {
    if (current.calib && target == null) {
      const t = makeTarget(null);
      setTarget(t);
      setN(t);
      setP(0);
      setRecorded([]);
      setNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* There is deliberately NO "sweep the cut" animation, and its absence is a
     design decision rather than an omission. A sweep walks the cut from 0 to N
     one position at a time — but this lab exists to teach the family of splits
     as a FAN seen all at once, not as a walk. An animated walk would quietly
     re-tell AddLab's count-on story and argue against the fan it sits under.
     The fan is already complete on arrival; nothing needs to move. */

  /* ---- interaction handlers ---------------------------------------------- */

  /* The whole moves, and the cut follows it down if it would be left stranded
     past the end of a smaller tray. (SubtractionLab's clamp precedent: never
     let a dial reach a state the mathematics does not have.) */
  const onParam = (key, value) => {
    const v = parseInt(value, 10);
    if (key === 'N') {
      setN(v);
      if (p > v) setP(v);
    } else {
      setP(Math.min(v, N));
    }
    setNote(null);
  };

  /* Map a pointer to the nearest cut position, but only inside the tray band. */
  const cutFromPointer = (e) => {
    const g = geomRef.current;
    if (!g) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y < g.trayY - 16 || y > g.trayY + g.trayH + 16) return null;
    const v = Math.round((x - g.trayX0) / g.unit);
    return v >= 0 && v <= g.N ? v : null;
  };

  const onPointerMove = (e) => {
    hoverRef.current = cutFromPointer(e);
    draw();
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
    draw();
  };
  const onPointerDown = (e) => {
    if (step < CUT_STEP) return;
    const v = cutFromPointer(e);
    if (v != null) {
      setP(v);
      setNote(null);
    }
  };

  /* Record a bond onto the sheet. A duplicate is refused — keeping track of
     what you already have IS the skill being tested. */
  const recordBond = () => {
    if (!calib || target == null) return;
    if (recorded.includes(p)) {
      setNote('dup');
      return;
    }
    setRecorded((r) => [...r, p]);
    setNote('new');
  };

  const newTarget = () => {
    const t = makeTarget(target);
    setTarget(t);
    setN(t);
    setP(0);
    setRecorded([]);
    setNote(null);
  };

  const resetDials = () => {
    if (calib) {
      setP(0);
    } else {
      setN(step === TEN_STEP ? 10 : START.N);
      setP(step === TEN_STEP ? 0 : START.p);
    }
    setNote(null);
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
    `${word(N)} equals ${word(p)} plus ${word(q)}. ` +
    `The whole is ${word(N)}. The cut leaves ${word(p)} on one side and ${word(q)} on the other. ` +
    `There are ${word(bondCount(N))} ways in all to cut a whole of ${word(N)}.`;

  return (
    <div className="nblab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Number Bonds — One Whole, Many Parts</h1>
        <p className="lede">
          A number is <em>made of</em> smaller numbers — almost always in more than one way. Set
          the whole, then slide the <span className="mono">cut</span>. The whole never changes; only
          the split does.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          {/* One equation, and only one. The turn-around N = q + p used to be
              printed here as a second line; it is the fan's mirror to show, not
              another row of symbols for a five-year-old to parse. */}
          <div className="stage-head">
            <p className="equation">
              <BondEquation N={N} p={p} q={q} />
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onPointerDown={onPointerDown}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {step >= CUT_STEP ? 'tap the tray to move the cut' : 'carmine + blue = the two parts'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && target != null
              ? ` Recorded ${word(recorded.length)} of ${word(bondCount(target))} bonds.`
              : ''}
            {calib && calibrated ? ` Calibrated — you found every way to make ${word(target)}.` : ''}
          </p>

          {/* The four-tile facts grid that used to sit here is gone. Every tile
              restated something already on screen — N is the top circle, p and q
              are the two circles below it and the two halves of the equation,
              and "ways to make N" is the fan's own caption. */}

          <div className="toolbar">
            <button
              type="button"
              className={'btn ghost' + (showFan ? ' on' : '')}
              onClick={() => setFanOpen((f) => !f)}
              disabled={step >= FAN_STEP}
              aria-pressed={showFan}
              title={step >= FAN_STEP ? 'The fan stays open from here on' : undefined}
            >
              {showFan ? 'Fan is open' : 'Show all the ways'}
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
              const val = { N, p }[d.key];
              // The cut cannot land past the end of the tray, so p's ceiling is
              // the live whole — not a constant.
              const dmax = d.key === 'p' ? N : d.max;
              // During the challenge the whole is LOCKED: the thing that stays
              // the same must actually stay the same.
              const frozen = d.key === 'N' && calib;
              return (
                <label className={'dial' + (unlocked && !frozen ? '' : ' locked')} key={d.key}>
                  <span className={'dk ' + d.key}>{d.label}</span>
                  <span className="drole">
                    {frozen ? 'locked to the target — the whole never changes' : unlocked ? d.role : 'unlocks soon'}
                  </span>
                  <input
                    type="range"
                    min={d.min}
                    max={dmax}
                    step={d.step}
                    value={val}
                    disabled={!unlocked || frozen}
                    aria-label={`Dial ${d.label} — ${d.role}`}
                    onChange={(e) => onParam(d.key, e.target.value)}
                  />
                  <output className="dv">{unlocked ? val : '🔒'}</output>
                </label>
              );
            })}
            {/* There is no q row here. An earlier draft showed q in a dial's
                slot with a dead track, to make the point that q is handed to you
                rather than chosen — but that put a fourth copy of q on screen
                and made the panel look like it had three dials. The point is
                made far better by q simply not being here: the child looks for
                a way to set the second part and finds that the lab does not
                offer one, because the mathematics does not. */}
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
                <span className="mono">
                  found&nbsp;{recorded.length}/{bondCount(target)}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">every way to make {target}</span>
                )}
              </div>
              <button
                type="button"
                className="btn"
                onClick={recordBond}
                disabled={calibrated || recorded.includes(p)}
              >
                {recorded.includes(p)
                  ? `${target} = ${p} + ${otherPart(target, p)} — already found`
                  : `Record  ${target} = ${p} + ${otherPart(target, p)}`}
              </button>
              {note && !calibrated && (
                <p className={'note ' + note}>
                  {note === 'dup'
                    ? 'You already have that one — try a new cut.'
                    : 'Recorded. Move the cut somewhere new and look for another.'}
                </p>
              )}
              {calibrated && (
                <p className="note new">
                  Every one of the {bondCount(target)} ways to make {target} — including{' '}
                  {target} = 0 + {target} and {target} = {target} + 0, the two most-forgotten bonds
                  of all.
                </p>
              )}
              <button type="button" className="btn ghost" onClick={newTarget}>
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
                  setRecorded([]);
                  setNote(null);
                  setFanOpen(false);
                  setN(START.N);
                  setP(START.p);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">N = p + q</span> &nbsp;·&nbsp; decomposing a whole of ten or less
        into pairs, every way at once, and the partners of ten (CCSS K.OA.A.3–4).
      </footer>

      <style jsx>{`
        .nblab {
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
          font-size: 22px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.01em;
        }
        /* whole-first: the whole is neutral ink (it is the constant), the cut
           side is the carmine accent, the remainder is blue */
        .equation .t-whole {
          color: var(--ink);
          font-weight: 700;
        }
        .equation .t-p {
          color: var(--curve);
          font-weight: 700;
        }
        .equation .t-q {
          color: var(--addend);
          font-weight: 700;
        }
        .equation .t-op {
          color: var(--ink-soft);
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 7 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        /* On a phone the 7:5 ratio is far too short for the stacked bands (the
           bond diagram, the tray, the brace, and up to 11 fan rows), so go
           taller-than-wide there. Both 4/5 and 2/3 were measured at 375px and
           both still crushed the N=10 fan — at 2/3 the rows fell to 12px apart
           and the equations to 6px, i.e. present but unreadable, which for the
           recording half of K.OA.A.3 is the same as absent. 1/2 is what the
           worst case actually needs to stay legible. */
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 2;
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
        /* A toggle that is disabled BECAUSE it is permanently on (the fan, from
           the fan step onward) must read as "locked on", not as broken — 40%
           carmine just looks like a rendering fault. */
        .btn.ghost.on:disabled {
          opacity: 0.8;
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
        .dk.N {
          color: var(--ink);
        }
        .dk.p {
          color: var(--curve);
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
        .note {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          padding: 8px 10px;
          border-radius: 6px;
        }
        .note.new {
          color: var(--ink);
          background: rgba(31, 138, 91, 0.08);
          border-left: 3px solid var(--ok);
        }
        .note.dup {
          color: var(--ink);
          background: rgba(91, 107, 123, 0.09);
          border-left: 3px solid var(--ink-soft);
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
        :global(.nblab) :focus-visible {
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
