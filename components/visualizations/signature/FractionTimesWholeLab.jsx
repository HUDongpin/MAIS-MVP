'use client';

/* ============================================================================
   FractionTimesWholeLab — an interactive "bench" for MULTIPLYING A FRACTION
   BY A WHOLE NUMBER as repeated addition of a unit fraction:

        3 × 2/5  =  2/5 + 2/5 + 2/5  =  6/5        because it is six copies
                                                     of the piece 1/5.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 4 lab —
   CCSS 4.NF.B.4 is the anchor, all three clauses:
     • 4.NF.B.4.a  a fraction a/b is a multiple of 1/b  (the plate: a copies
                   of one piece)
     • 4.NF.B.4.b  n × (a/b) = (n × a)/b — a multiple of a/b is a multiple of
                   1/b  (the rename, read off the poured tray)
     • 4.NF.B.4.c  word problems: n servings of a/b each  (the roast-beef
                   step, and the capstone's order-filling challenge).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "PLATES POUR INTO THE TRAY."
     One plate holds a pieces of size 1/b — that IS the fraction a/b.  The
     Copies dial (or the PRESS button) sets n identical plates on the table:
     nothing about a plate changes, there are simply more of them, which is
     what multiplying by a whole number MEANS.  Below, all the plates pour
     into ONE TRAY, where every b pieces snap into a completed gold WHOLE
     BRICK and only the leftover pieces stay loose — so 3 × 2/5 lands as one
     whole brick and one loose fifth, and the mixed reading is something the
     tray does, not a rule.  The equation band writes the same story three
     ways: n × a/b, the repeated sum, and the piece count (n·a)/b.
     The star exhibit is the RENAME FOIL for the most common error in this
     topic, 3 × 2/5 = 6/15 ("multiply the bottom too"): the foil strip lays
     six FIFTEENTHS under the tray and lands at exactly the length of ONE
     plate — because 6/15 is just another name for 2/5.  Multiplying top and
     bottom together manufactures a new NAME, not a new AMOUNT; the error is
     not lectured against, it is measured and found to have gone nowhere.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • FractionAdditionLab (4.NF.B.3) owns the two-colour JOIN: two different
       counts meeting end to end, the walking decomposition marker, and the
       add-the-bottoms foil.  This lab joins nothing unlike: it COPIES one
       count n times, its pieces arrive on plates (containers, not runs), and
       completed wholes pack into bricks instead of running past tick marks.
     • MultiplicationLab owns a × b as an ARRAY of unit squares on a grid.
       Nothing here tiles a rectangle: plates are separate containers with
       gaps, the tray is a single line of bricks and loose pieces, and no
       area language appears.
     • MultiplesLab owns skip-counting on a NUMBER LINE with equal jumps.
       No number line is drawn here and nothing jumps: the running total
       lives in the equation band, not on an axis.
     • FractionLab owns the partitioned whole (a bar cut into q parts with
       the empty parts showing).  This lab never draws an empty part: loose
       pieces end free, and a completed whole is a sealed brick, not a
       filled-up outline.
     • RatioLab owns the batch tape (two co-varying quantities repeating).
       One quantity lives here, and the word "batch" does not.
     • MeanLab owns unit-cube towers.  Nothing stacks vertically here.

   One-accent discipline: CARMINE is the fraction being copied — the pieces
   on every plate, the loose pieces in the tray, the product readout.  GOLD
   marks STRUCTURE and the goal — the completed whole bricks, the capstone's
   order outlines.  The foil strip is neutral slate (a wrong idea is never
   the accent).  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • Copies n, count a, and piece size b are INTEGERS; the product is the
       integer n·a and every stated number is exact integer arithmetic.
     • The tray's packing is toMixed(n·a, b): wholes = ⌊n·a/b⌋, loose =
       n·a mod b, and wholes·b + loose === n·a is audited for every setting.
     • The foil strip's pieces have width exactly 1/(n·b) of a whole, so the
       foil measures exactly one plate: (n·a)/(n·b) === a/b — an exact
       rational identity, audited by cross products, never by eyeball.
     • The calibration stamp is the integer identity n·a === target.  The
       meter reads 100 only at equality (99 is its ceiling everywhere else),
       audited over every target × every reachable (n, a).
   Verified by audit-fractiontimeswhole.mjs (numeric proof + source greps)
   and verify-fractiontimeswhole.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionTimesWholeLab.jsx
     2. Import and render it:
          import FractionTimesWholeLab from './FractionTimesWholeLab';
          export default function Page() { return <FractionTimesWholeLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (copies n, count a,
              piece size b, the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic on piece counts; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Three dials: copies, count per plate, piece size.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the fraction being copied, and the product
const GOLD = '#b98718'; // structure: completed wholes, the capstone order
const SLATE = '#5b6b7b'; // the foil strip (a wrong idea is never the accent)

const DIALS = [
  { key: 'count', name: 'On each plate', role: 'pieces on one plate — the fraction a/b', min: 1, max: 8, unlock: 0, color: CARMINE },
  { key: 'size', name: 'Piece size', role: 'how many pieces make one whole', min: 2, max: 8, unlock: 0, color: GOLD },
  { key: 'copies', name: 'Copies', role: 'how many identical plates — the whole number', min: 1, max: 6, unlock: 1, color: CARMINE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integers: the product is a count of unit fractions.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const ONES_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS_W = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
function wordFor(v) {
  if (v < 20) return ONES_W[v];
  const t = Math.floor(v / 10);
  const o = v % 10;
  return TENS_W[t] + (o ? '-' + ONES_W[o] : '');
}
const PIECE_W = ['', '', 'half', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const pieceWord = (b, plural) => (b === 2 && plural ? 'halves' : PIECE_W[b] + (plural ? 's' : ''));
const countWords = (n, b) => `${wordFor(n)} ${pieceWord(b, n !== 1)}`;

/* the whole lab in one line: n plates of a pieces are n·a pieces */
const prodCount = (n, a) => n * a;

/* the tray packs every b pieces into a whole brick; the rest stay loose */
const toMixed = (t, b) => ({ w: Math.floor(t / b), r: t % b });
const mixedWords = (t, b) => {
  const { w, r } = toMixed(t, b);
  if (w === 0) return null;
  const wholes = `${wordFor(w)} whole${w === 1 ? '' : 's'}`;
  return r === 0 ? `${wholes} exactly` : `${wholes} and ${countWords(r, b)}`;
};

/* the rename foil: n × a/b done "top and bottom" gives (n·a)/(n·b) — the SAME
   amount as a/b.  Equality is checked by cross products, exactly. */
const sameAmount = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;
const foilNum = (n, a) => n * a;
const foilDen = (n, b) => n * b;

/* pressing sets one more identical plate; moves are gated, never clamped */
const canPress = (n) => n < 6;
const canRemove = (n) => n > 1;
const pressMove = (n) => n + 1;
const removeMove = (n) => n - 1;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Fill the order."  A target count of pieces (shown
   as a gold outline of bricks and loose pieces in the tray) that no single
   plate can reach — so the student must choose BOTH how many copies and how
   much on each plate.  Many factorings work: 12 fifths is 6 plates of 2/5,
   4 of 3/5, 3 of 4/5 … quietly teaching factor pairs inside fraction land.

   No false stamp, provably: CALIBRATED ⟺ n·a === target.t, an integer
   identity with b pinned to target.d.  The meter reads 100 only at equality
   (its ceiling is 99 everywhere else), audited over every target × every
   reachable (n, a).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let t, d;
  do {
    d = 3 + Math.floor(Math.random() * 6); // 3 … 8 pieces make a whole
    const n0 = 2 + Math.floor(Math.random() * 4); // 2 … 5 copies
    const a0 = 2 + Math.floor(Math.random() * (d - 1)); // 2 … d on each plate
    t = n0 * a0;
  } while (t < d + 1 || t > 3 * d || (prev && t === prev.t && d === prev.d));
  return { t, d };
}
const closeness = (p, t, d) =>
  p === t ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(t - p) * 100) / (3 * d))));
const isCalibrated = (p, t) => p === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One plate is a fraction',
    body:
      'A plate holds 2 pieces, and each piece is a FIFTH — five of them would make one whole. ' +
      'So the plate holds 2/5. Slide the two dials and watch the plate.',
    demo: { n: 1, a: 2, b: 5 },
    q: 'Each piece on the plate is one fifth… of what?',
    choices: ['Of one whole — five pieces would make a whole', 'Of the plate — the plate is the whole', 'Of the biggest plate on the table'],
    answer: 0,
    feedback:
      'Of one WHOLE. The bottom number talks about the whole, never about the plate: a fifth ' +
      'is the piece so big that five fill a whole. The plate just happens to be holding two of ' +
      'them — that is why the plate is 2/5, less than one whole.',
  },
  {
    title: 'Copies of the same plate',
    body:
      'The Copies control is unlocked. PRESS to set another identical plate on the table: ' +
      '3 × 2/5 means 2/5, three times. Watch the tray below collect all the pieces.',
    demo: { n: 3, a: 2, b: 5 },
    buttons: ['press', 'remove'],
    q: '3 × 2/5 = ?',
    choices: ['6/5', '6/15', '2/15'],
    answer: 0,
    feedback:
      'Six fifths. Three plates of two fifths tip six FIFTHS into the tray — the pieces do not ' +
      'change size just because there are more plates. 6/15 multiplies the bottom too (watch ' +
      'the next steps measure that mistake), and 2/15 multiplies only the bottom.',
  },
  {
    title: 'Count it in single pieces',
    body:
      'Read the tray piece by piece: three plates of two fifths is six pieces, each 1/5. That ' +
      'is the whole rule — n × a/b is (n·a) copies of 1/b.',
    demo: { n: 3, a: 2, b: 5 },
    lens: { unit: true },
    q: '3 × 2/5 counts the very same pieces as…',
    choices: ['6 × 1/5', '6 × 1/15', '5 × 1/6'],
    answer: 0,
    feedback:
      '6 × 1/5 — six single fifths. A plate of 2/5 is already two copies of the piece 1/5, so ' +
      'three plates are 3 × 2 = 6 copies of it. That is why the rule is (n × a)/b: the bottom ' +
      'names the piece, and the two tops multiply into one count.',
  },
  {
    title: 'The rename trap, measured',
    body:
      'The slate strip below the tray shows the classic error 3 × 2/5 = 6/15 — six pieces of a ' +
      'much smaller size. Measure it against a single plate.',
    demo: { n: 3, a: 2, b: 5 },
    lens: { foil: true },
    q: '6/15 of a whole is…',
    choices: ['Exactly as much as one plate, 2/5 — a new name, not a new amount', 'Three times as much as 2/5', 'A little more than 2/5'],
    answer: 0,
    feedback:
      'Exactly 2/5 — the strip lands level with ONE plate. Multiplying top AND bottom by 3 ' +
      'renames the fraction (three times as many pieces, each a third the size) and the amount ' +
      'goes nowhere. Only the TOP multiplies, because only the count grows.',
  },
  {
    title: 'The tray packs wholes',
    body:
      'Four plates of 3/8: twelve eighths pour in, and every eight pieces snap into a gold ' +
      'WHOLE brick. Read the tray: one brick and four loose eighths.',
    demo: { n: 4, a: 3, b: 8 },
    q: '5 × 3/4 = 15/4. How many whole bricks does the tray pack?',
    choices: ['3 bricks, with 3/4 left loose', '15 bricks', '4 bricks'],
    answer: 0,
    feedback:
      'Fifteen fourths: every four pieces seal one brick, so 15 = 4 + 4 + 4 + 3 packs THREE ' +
      'bricks and leaves three fourths loose — 15/4 = 3 wholes and 3/4. The mixed number is ' +
      'the tray doing its job, not a new rule to memorise.',
  },
  {
    title: 'A real order',
    body:
      'Five people each eat 3/8 of a pound of roast beef. The plates ARE the people. How much ' +
      'beef is that altogether?',
    demo: { n: 5, a: 3, b: 8 },
    q: 'Five servings of 3/8 pound come to…',
    choices: ['15/8 — one whole pound and 7/8 more', '8/15 of a pound', '15/40 of a pound'],
    answer: 0,
    feedback:
      'Fifteen eighths of a pound: 5 × 3 = 15 pieces, each an eighth of a pound. Eight of them ' +
      'make the first whole pound and seven eighths remain — just under two pounds. 15/40 is ' +
      'the rename trap again, and 8/15 turns the question upside down.',
  },
  {
    title: 'Fill the order',
    body:
      'A gold order is chalked in the tray — bricks and loose pieces. Choose the number of ' +
      'plates AND what each plate holds so the pour fills it exactly. More than one recipe works.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionTimesWholeLab() {
  const [n, setN] = useState(1);
  const [a, setA] = useState(2);
  const [b, setB] = useState(5);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const lens = current.lens || {};
  const buttons = current.buttons || [];

  const prod = prodCount(n, a);
  const pct = calib && target != null ? closeness(prod, target.t, target.d) : 0;
  const calibrated = calib && target != null ? isCalibrated(prod, target.t) : false;

  sceneRef.current = {
    n,
    a,
    b,
    unit: !calib && !!lens.unit,
    foil: !calib && !!lens.foil,
    calib,
    calibrated,
    target: calib ? target : null,
  };

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

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const total = prodCount(S.n, S.a);
    const { w: wholes, r: loose } = toMixed(total, S.b);
    const tWholes = S.target ? toMixed(S.target.t, S.target.d).w : 0;
    const tLoose = S.target ? toMixed(S.target.t, S.target.d).r : 0;

    /* ---- the SAY band: n × a/b [= sum] = (n·a)/b, then words --------------- */
    const bandY = 34;
    const fs = Math.min(22, W / 26);
    const fracW = (num, den) => {
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      return Math.max(ctx.measureText(String(num)).width, ctx.measureText(String(den)).width) + 8;
    };
    const drawFrac = (cx, num, den, color) => {
      const w = fracW(num, den);
      ctx.fillStyle = color;
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      ctx.fillText(String(num), cx, bandY - fs * 0.62);
      ctx.fillText(String(den), cx, bandY + fs * 0.66);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, bandY);
      ctx.lineTo(cx + w / 2, bandY);
      ctx.stroke();
      return w;
    };
    {
      const gap = 12;
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      const segs = [];
      segs.push({ kind: 'text', s: `${S.n} ×`, color: INK });
      segs.push({ kind: 'frac', num: S.a, den: S.b, color: CARMINE });
      if (S.n >= 2 && S.n <= 4) {
        segs.push({ kind: 'text', s: '=', color: INK });
        for (let i = 0; i < S.n; i++) {
          if (i > 0) segs.push({ kind: 'text', s: '+', color: INK });
          segs.push({ kind: 'frac', num: S.a, den: S.b, color: CARMINE });
        }
      }
      segs.push({ kind: 'text', s: '=', color: INK });
      segs.push({ kind: 'frac', num: total, den: S.b, color: CARMINE });
      let runW = 0;
      for (const sg of segs) {
        sg.w = sg.kind === 'frac' ? fracW(sg.num, sg.den) : ctx.measureText(sg.s).width;
        runW += sg.w + gap;
      }
      runW -= gap;
      let x = W / 2 - runW / 2;
      for (const sg of segs) {
        if (sg.kind === 'frac') drawFrac(x + sg.w / 2, sg.num, sg.den, sg.color);
        else {
          ctx.fillStyle = sg.color;
          ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
          ctx.fillText(sg.s, x + sg.w / 2, bandY);
        }
        x += sg.w + gap;
      }
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    ctx.fillText(
      `${wordFor(S.n)} ${S.n === 1 ? 'copy' : 'copies'} of ${countWords(S.a, S.b)} — ${countWords(total, S.b)} in the tray`,
      W / 2,
      bandY + fs * 1.8
    );
    let extraLine = bandY + fs * 1.8 + 19;
    if (S.unit) {
      ctx.fillStyle = CARMINE;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(`= ${total} copies of the single piece 1/${S.b}`, W / 2, extraLine);
      extraLine += 19;
    }
    const mixed = mixedWords(total, S.b);
    if (mixed) {
      ctx.fillStyle = GOLD;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(`= ${mixed}`, W / 2, extraLine);
    }

    /* ---- shared scale: one whole is a brick; a piece is brick/b ------------ */
    const maxWholes = Math.max(wholes + 1, tWholes + 1, 3);
    const bw = Math.min(118, (W - 90) / maxWholes); // brick width = one whole
    const bh = 46;
    const pw = bw / S.b; // one piece, true to scale everywhere

    /* ---- the PLATES (top): n containers, each holding a pieces ------------- */
    const plateY = 118;
    const plateH = 40;
    const plateW = S.a * pw + 14;
    const perRow = Math.min(S.n, 3);
    const rows = Math.ceil(S.n / 3);
    for (let i = 0; i < S.n; i++) {
      const row = Math.floor(i / 3);
      const inRow = row === rows - 1 && S.n % 3 !== 0 ? S.n % 3 : perRow;
      const rowW = inRow * (plateW + 16) - 16;
      const px = W / 2 - rowW / 2 + (i % 3) * (plateW + 16);
      const py = plateY + row * (plateH + 26);
      ctx.strokeStyle = 'rgba(28,43,58,0.45)';
      ctx.lineWidth = 1.4;
      rr(px, py, plateW, plateH, 9);
      ctx.stroke();
      for (let j = 0; j < S.a; j++) {
        ctx.fillStyle = CARMINE;
        rr(px + 7 + j * pw, py + 6, pw - 2, plateH - 12, 3);
        ctx.fill();
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      ctx.fillText(`${S.a}/${S.b}`, px + plateW / 2, py + plateH + 10);
    }
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${S.n} plate${S.n === 1 ? '' : 's'}`, 18, plateY - 14);
    ctx.textAlign = 'center';

    /* ---- the TRAY (bottom): bricks + loose pieces -------------------------- */
    const trayY = S.foil ? H - 170 : H - 118;
    const x0 = 44;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 10, trayY + bh + 4.5);
    ctx.lineTo(W - 30, trayY + bh + 4.5);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the tray', 18, trayY - 30);
    ctx.textAlign = 'center';

    /* the capstone order: gold dashed outlines to fill exactly */
    if (S.calib && S.target) {
      for (let i = 0; i < tWholes; i++) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        rr(x0 + i * (bw + 8) - 2.5, trayY - 2.5, bw + 5, bh + 5, 8);
        ctx.stroke();
      }
      const lx = x0 + tWholes * (bw + 8);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      if (tLoose > 0) rr(lx - 2.5, trayY - 2.5, tLoose * pw + 5, bh + 5, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`the order: ${S.target.t}/${S.target.d}`, x0, trayY - 14);
      ctx.textAlign = 'center';
    }

    /* completed wholes: sealed gold-rimmed bricks */
    for (let i = 0; i < wholes; i++) {
      const bx = x0 + i * (bw + 8);
      ctx.fillStyle = 'rgba(200,30,79,0.12)';
      rr(bx, trayY, bw, bh, 6);
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      rr(bx, trayY, bw, bh, 6);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = `700 ${Math.min(19, bw * 0.3)}px system-ui, sans-serif`;
      ctx.fillText('1 whole', bx + bw / 2, trayY + bh / 2);
    }
    /* loose pieces: true-size tiles, ending free (no empty outline) */
    const looseX = x0 + wholes * (bw + 8);
    for (let j = 0; j < loose; j++) {
      ctx.fillStyle = CARMINE;
      rr(looseX + j * pw + 1, trayY + 1, pw - 2, bh - 2, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.35)';
      ctx.lineWidth = 1;
      rr(looseX + j * pw + 1, trayY + 1, pw - 2, bh - 2, 3);
      ctx.stroke();
    }
    if (loose > 0) {
      ctx.fillStyle = CARMINE;
      ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
      ctx.fillText(`${loose}/${S.b} loose`, looseX + (loose * pw) / 2, trayY + bh + 18);
    }

    /* ---- the FOIL strip (lens): (n·a)/(n·b), measured against one plate ---- */
    if (S.foil) {
      const fy = H - 74;
      const fn = foilNum(S.n, S.a);
      const fd = foilDen(S.n, S.b);
      const fpw = bw / fd; // pieces of the foil's smaller size, same whole scale
      ctx.strokeStyle = 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0 - 10, fy + 30.5);
      ctx.lineTo(W - 30, fy + 30.5);
      ctx.stroke();
      for (let j = 0; j < fn; j++) {
        ctx.strokeStyle = SLATE;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        rr(x0 + j * fpw + 0.5, fy + 0.5, fpw - 1, 29, 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the one-plate measuring bracket above it */
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x0, fy - 8);
      ctx.lineTo(x0, fy - 3);
      ctx.moveTo(x0, fy - 8);
      ctx.lineTo(x0 + S.a * pw, fy - 8);
      ctx.moveTo(x0 + S.a * pw, fy - 8);
      ctx.lineTo(x0 + S.a * pw, fy - 3);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `the trap ${fn}/${fd}: exactly ONE plate's worth — a rename, not a growth`,
        x0 + fn * fpw + 12,
        fy + 15
      );
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

  /* every step whose words name a scene opens on that scene */
  useEffect(() => {
    const d = STEPS[step].demo;
    if (d) {
      setN(d.n);
      setA(d.a);
      setB(d.b);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setB(t.d);
      setN(1);
      setA(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const press = () => {
    if (!canPress(n)) return;
    setN(pressMove(n));
  };
  const remove = () => {
    if (!canRemove(n)) return;
    setN(removeMove(n));
  };
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const d = current.demo;
    if (d) {
      setN(d.n);
      setA(d.a);
      setB(d.b);
    } else if (calib) {
      setN(1);
      setA(1);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'size') {
      const nb = clampInt(raw, 2, 8);
      setB(nb);
      setA((v) => Math.min(v, nb));
    } else if (key === 'count') {
      setA(clampInt(raw, 1, b));
    } else {
      setN(clampInt(raw, 1, 6));
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `${wordFor(n)} ${n === 1 ? 'copy' : 'copies'} of ${countWords(a, b)} makes ${countWords(prod, b)}.` +
    (mixedWords(prod, b) ? ` That is ${mixedWords(prod, b)}.` : '') +
    (calib && target ? ` The order asks for ${countWords(target.t, target.d)}.` : '');

  return (
    <div className="ftwlab">
      <header className="head">
        <h1>A Whole Number Times a Fraction</h1>
        <p className="lede">
          Multiplying by a whole number means <em>copies</em>: 3 × 2/5 is three plates of two
          fifths — six fifths in the tray. Only the <em>count</em> grows; the piece keeps its name.
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
            {calibrated ? ' Calibrated — the pour fills the order exactly.' : ''}
          </p>

          <div className="toolbar">
            {buttons.includes('press') && (
              <button type="button" className="btn count" onClick={press} disabled={!canPress(n)}>
                + set another plate
              </button>
            )}
            {buttons.includes('remove') && (
              <button type="button" className="btn count" onClick={remove} disabled={!canRemove(n)}>
                − take one back
              </button>
            )}
            <button type="button" className="btn ghost" onClick={reset}>
              Start over
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
            {DIALS.filter((d) => !(calib && d.key === 'size')).map((d) => {
              const unlocked = step >= d.unlock;
              const value = d.key === 'count' ? a : d.key === 'size' ? b : n;
              const max = d.key === 'count' ? b : d.max;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">{unlocked ? d.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={d.min}
                    max={max}
                    step={1}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${d.name} — ${d.role}`}
                    onChange={(e) => setDial(d.key, e.target.value)}
                    style={{ accentColor: d.color }}
                  />
                  <output className="dv" style={unlocked ? { color: d.color } : undefined}>
                    {unlocked ? value : '🔒'}
                  </output>
                </label>
              );
            })}
          </div>

          {hasQuestion && (
            <div className="quiz">
              <p className="q">{current.q}</p>
              <div className="choices">
                {current.choices.map((ch, i) => {
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
                      {ch}
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
                <span className="target-k">Fill the order</span>
                <span className="target-word">
                  {target.t}/{target.d}
                </span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${n} plates of ${a}/${target.d} fill it exactly`
                    : `${mixedWords(target.t, target.d)} — plates × pieces must make ${target.t}`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'the pour fits exactly' : prod > target.t ? 'over-poured' : 'pouring…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {n} × {a} = {prod} of {target.t}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setB(t.d);
                  setN(1);
                  setA(1);
                }}
              >
                New order
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
                  setN(1);
                  setA(2);
                  setB(5);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">3 × 2/5 = 6/5 · 15/8 = 1 whole and 7/8</span> &nbsp;·&nbsp; a
        fraction is a multiple of its unit fraction, and n × (a/b) = (n·a)/b (CCSS 4.NF.B.4); the
        tray packs every b pieces into a whole brick. Only the top multiplies — multiplying both
        top and bottom just <em>renames</em> the plate.
      </footer>

      <style jsx>{`
        .ftwlab {
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
            /* minmax(0,1fr), never a bare 1fr (the TeenNumbersLab lesson) */
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
          aspect-ratio: 4 / 3;
          min-height: 400px;
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
            min-height: 340px;
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
        .btn.count {
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
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 600;
          letter-spacing: 0.01em;
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
        :global(.ftwlab) :focus-visible {
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
