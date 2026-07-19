'use client';

/* ============================================================================
   FractionAdditionLab — an interactive "bench" for ADDING AND SUBTRACTING
   FRACTIONS WITH LIKE DENOMINATORS, decomposing a fraction into a sum, and
   reading an improper sum as a mixed number.

        3/8 + 2/8 = 5/8        —  three eighths and two eighths are FIVE
                                   eighths, exactly as three apples and two
                                   apples are five apples.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 4 lab —
   CCSS 4.NF.B.3 is the anchor, all four clauses:
     • 4.NF.B.3.a  addition/subtraction of fractions as JOINING and SEPARATING
                   parts referring to the same whole  (the shelf, and the lift)
     • 4.NF.B.3.b  DECOMPOSE a fraction into a sum of fractions with the same
                   denominator in more than one way  (the walking seam)
     • 4.NF.B.3.c  add and subtract mixed numbers with like denominators (the
                   improper sum read as "one whole and …" at the gold tick)
     • 4.NF.B.3.d  word problems — the capstone's build-the-target challenge.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE PIECE SHELF: tops count, bottoms name."
     The unit fraction 1/b is a PIECE — a physical tile of one fixed size — and
     a fraction a/b is a COUNT of those pieces.  Addition lays the two counts
     end to end on one shelf: the picture of 3/8 + 2/8 is literally three
     carmine eighths, then two blue eighths, and the answer is read by COUNTING
     five pieces, not by any new rule.  The denominator is the pieces' NAME,
     and names do not add: joining trays cannot re-cut the tiles.
     The star exhibit is the FOIL SHELF for the single most common error in
     fraction addition, 3/8 + 2/8 = 5/16: directly beneath the true sum, a
     ghost shelf lays out five SIXTEENTHS — and lands at exactly HALF the
     length, because a sixteenth is half an eighth.  The wrong rule is not
     lectured against; it is drawn, and it is visibly too short.
     Past the gold ONE-WHOLE tick, the same count earns a second name: six
     fourths is one whole and two fourths — the mixed number is a READING of
     the shelf, not a new object.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • FractionLab owns the PARTITIONED WHOLE: one bar CUT into q equal parts
       with p shaded, echoed as a pie, plus the SPLIT dial that re-cuts every
       part for equivalence.  This lab never cuts a whole and never re-cuts a
       piece: its pieces arrive as loose, fixed-size tiles, and no pie, no
       sector, and no split dial appear.  (FractionLab teaches what a/b IS;
       this lab counts with it.)
     • EquivalentFractionsLab owns the name lattice and simplification.  This
       lab NEVER simplifies: 6/4 stays 6/4 (read as "1 whole and 2 fourths"),
       and gcd/reduction is not in the code — renaming is that lab's job.
     • AddLab owns count-on hops and unit bars on a NUMBER LINE; MultiplesLab
       owns skip-counting.  No number line is drawn here and nothing hops:
       the pieces are lengths on a shelf, counted, never coordinates.
     • NumberBondLab owns the fan of ALL splits of one whole number ≤ 10.
       Here decomposition is ONE gold seam WALKING along a fraction's shelf —
       one split at a time, of a count of unit fractions, not a fan of bonds.
     • DecimalLab / PercentageLab own the 10×10 hundredths grid.  No grid of
       cells-as-parts-of-one-whole appears here.
     • UnlikeDenominatorsLab (5.NF.A.1) owns the re-cut that makes UNLIKE
       pieces addable.  This lab's pieces always match by construction, and
       the words "common denominator" never appear — when the bottoms differ,
       that is the sequel's story.

   One-accent discipline, adapted for a two-addend lab (the ComparingLab /
   RatioLab convention): the FIRST count is CARMINE and the SUM is read in
   carmine; the SECOND count is the restrained BLUE companion.  GOLD marks
   STRUCTURE — the whole ticks, the walking seam, the capstone target.  GREEN
   is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a nine-year-old):
     • Counts a, c and the piece size b are INTEGERS; every stated number is
       integer arithmetic on them.  a + c, a − c, and the mixed reading
       (whole = ⌊n/b⌋, rest = n mod b) are exact; nothing floats.
     • Both addends are proper (a ≤ b, c ≤ b), so the sum lives on a shelf of
       at most TWO wholes and every scene fits without rescaling tricks.
     • Subtraction is GATED, never clamped: the take-away count cannot exceed
       what sits on the shelf (the dial's max is the minuend).
     • The foil shelf's pieces have width exactly 1/(2b) of a whole, so the
       false sum measures exactly half the true one — an exact statement,
       audited, not a visual approximation.
     • The calibration stamp is the integer identity a + c === target.  The
       meter reads 100 only at equality (99 is its ceiling everywhere else),
       audited over every target × every reachable (a, c).
   Verified by audit-fractionaddition.mjs (numeric proof + source greps) and
   verify-fractionaddition.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionAdditionLab.jsx
     2. Import and render it:
          import FractionAdditionLab from './FractionAdditionLab';
          export default function Page() { return <FractionAdditionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (counts a and c, the
              piece size b, the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic on piece counts; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Three dials: the two counts and the piece size.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the first count, and the sum being read
const BLUE = '#3f74a6'; // the second count (the principled second colour)
const GOLD = '#b98718'; // structure: whole ticks, the seam, the target

const DIALS = [
  { key: 'first', name: 'First count', role: 'how many pieces arrive first', min: 0, max: 12, unlock: 0, color: CARMINE },
  { key: 'second', name: 'Second count', role: 'how many pieces join (or leave)', min: 0, max: 12, unlock: 1, color: BLUE },
  { key: 'size', name: 'Piece size', role: 'how many pieces make one whole', min: 2, max: 12, unlock: 0, color: GOLD },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer arithmetic on counts of unit fractions.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const NUM_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four',
];
const numWord = (n) => NUM_W[n];

/* the piece NAMES: 1/b is "one half / third / fourth …"; names never add */
const PIECE_W = ['', '', 'half', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const pieceWord = (b, plural) => (b === 2 && plural ? 'halves' : PIECE_W[b] + (plural ? 's' : ''));
const countWords = (n, b) => `${numWord(n)} ${pieceWord(b, n !== 1)}`;

/* joining and separating are COUNTING — the whole thesis in two lines */
const sumCount = (a, c) => a + c;
const takeCount = (a, c) => a - c; // gated by the dial: c ≤ a, never clamped here

/* the walking seam: one piece crosses the a|c boundary; the sum never moves.
   Moves are GATED (disabled at the rails), never clamped. */
const canSeamLeft = (a, c, b) => c >= 1 && a < b;
const canSeamRight = (a, c, b) => a >= 1 && c < b;
const seamLeftMove = (a, c) => [a + 1, c - 1];
const seamRightMove = (a, c) => [a - 1, c + 1];

/* the mixed reading at the gold tick: n pieces of size 1/b pass ⌊n/b⌋ wholes */
const toMixed = (n, b) => ({ w: Math.floor(n / b), r: n % b });
const mixedWords = (n, b) => {
  const { w, r } = toMixed(n, b);
  if (w === 0) return null;
  const wholes = `${numWord(w)} whole${w === 1 ? '' : 's'}`;
  return r === 0 ? `${wholes} exactly` : `${wholes} and ${countWords(r, b)}`;
};

/* the foil: "add the bottoms too" lays n pieces of size 1/(2b) — half length */
const foilPieces = (a, c) => a + c;
const foilDen = (b) => 2 * b;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Build the target."  A target count of pieces past
   one whole (so the mixed reading is exercised); the student chooses BOTH
   addends.  Because each addend is at most one whole (≤ d pieces), any pair
   that lands must use two real addends — the constraint enforces itself.

   No false stamp, provably: CALIBRATED ⟺ a + c === target.n, an integer
   identity with b pinned to target.d.  The meter reads 100 only at equality
   (its ceiling is 99 everywhere else), audited over every target × every
   reachable (a, c).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let n, d;
  do {
    d = 3 + Math.floor(Math.random() * 6); // 3 … 8 pieces make a whole
    n = d + 1 + Math.floor(Math.random() * (d - 1)); // d+1 … 2d−1: past one whole
  } while (prev && n === prev.n && d === prev.d);
  return { n, d };
}
const closeness = (s, t, d) =>
  s === t ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(t - s) * 100) / (2 * d))));
const isCalibrated = (s, t) => s === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'A fraction is a count of pieces',
    body:
      'One whole breaks into equal pieces, and the piece gets a name: when eight make a whole, ' +
      'the piece is an EIGHTH. Slide the counts and the piece size — the shelf shows your pieces.',
    demo: { a: 3, c: 0, b: 8 },
    q: 'In 3/8, what does the bottom number tell you?',
    choices: [
      'The size of the piece — how many make one whole',
      'How many pieces you have',
      'How big the answer will be',
    ],
    answer: 0,
    feedback:
      'The bottom NAMES the piece: eighths are the pieces so small that eight make one whole. ' +
      'The top does the counting — you have three of them. Keep the two jobs separate and ' +
      'fraction addition is about to feel easy.',
  },
  {
    title: 'Adding is counting on',
    body:
      'The second count is unlocked. Three eighths arrive, then two more eighths join them on ' +
      'the shelf. Count the pieces.',
    demo: { a: 3, c: 2, b: 8 },
    q: '3/8 + 2/8 = ?',
    choices: ['5/8', '5/16', '6/8'],
    answer: 0,
    feedback:
      'Five eighths. Three pieces and two pieces are five pieces — and every piece is still an ' +
      'eighth, so the answer is 5/8. Adding fractions with the same name is just adding, the ' +
      'way three apples and two apples are five apples.',
  },
  {
    title: 'Why the bottom cannot change',
    body:
      'The ghost shelf below shows the classic mistake, 3/8 + 2/8 = 5/16 — five pieces of a ' +
      'SMALLER size. Compare the lengths.',
    demo: { a: 3, c: 2, b: 8 },
    lens: { foil: true },
    q: 'When trays of eighths are pushed together, the pieces become…',
    choices: ['Exactly the same size as before', 'Smaller — they turn into sixteenths', 'Bigger — they melt together'],
    answer: 0,
    feedback:
      'The same size — setting tiles side by side cannot slice them thinner. A sixteenth is ' +
      'HALF an eighth, so the 5/16 shelf lands at exactly half the true length. The bottoms ' +
      'never add, because the bottom is a name, not an amount.',
  },
  {
    title: 'One count, many splits',
    body:
      'Five eighths sits on the shelf with a gold seam in it. Walk the seam: every position is ' +
      'a different way to write 5/8 as a sum.',
    demo: { a: 2, c: 3, b: 8 },
    buttons: ['left', 'right'],
    q: 'Which of these is NOT a way to split 5/8?',
    choices: ['4/8 + 2/8', '1/8 + 4/8', '2/8 + 3/8'],
    answer: 0,
    feedback:
      '4/8 + 2/8 makes SIX eighths, not five — the two tops must count to exactly 5. Every ' +
      'true split (5 = 1+4 = 2+3 = 3+2 = 4+1) is the same five pieces with the seam in a ' +
      'different place. Decomposing a fraction is just deciding where to break the count.',
  },
  {
    title: 'Past one whole',
    body:
      'Three fourths plus three fourths: the count crosses the gold ONE-WHOLE tick. The shelf ' +
      'earns a second name — read it under the equation.',
    demo: { a: 3, c: 3, b: 4 },
    q: '5/4 + 2/4 = ?',
    choices: ['7/4 — one whole and 3/4', '7/8', '1 and 1/4'],
    answer: 0,
    feedback:
      'Seven fourths. Four of them fill one whole (that is the gold tick), and three fourths ' +
      'remain: 7/4 = 1 whole and 3/4. The mixed number is not new math — it is the same shelf, ' +
      'read against the tick. 7/8 would mean the pieces shrank, and they never do.',
  },
  {
    title: 'Taking pieces away',
    body:
      'Subtraction separates: seven eighths sit on the shelf, and the second dial now LIFTS ' +
      'pieces off. Take three away and count what remains.',
    demo: { a: 7, c: 3, b: 8 },
    mode: 'take',
    q: '7/8 − 3/8 = ?',
    choices: ['4/8', '4', '10/8'],
    answer: 0,
    feedback:
      'Four eighths. Seven pieces, lift three off, four remain — and they are still eighths, ' +
      'so the answer is 4/8, not a bare 4 (that would be four WHOLES — look how much longer ' +
      'the shelf would need to be). 10/8 is what joining would give; taking away separates.',
  },
  {
    title: 'Build the target',
    body:
      'A gold target is waiting past the one-whole tick. Choose BOTH counts so they add to it ' +
      'exactly. Each count is at most one whole — so you will need two real addends.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionAdditionLab() {
  const [a, setA] = useState(3);
  const [c, setC] = useState(0);
  const [b, setB] = useState(8);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const mode = current.mode === 'take' ? 'take' : 'join';
  const foil = !calib && !!(current.lens && current.lens.foil);
  const buttons = current.buttons || [];

  const n = mode === 'take' ? takeCount(a, c) : sumCount(a, c);
  const pct = calib && target != null ? closeness(sumCount(a, c), target.n, target.d) : 0;
  const calibrated = calib && target != null ? isCalibrated(sumCount(a, c), target.n) : false;

  sceneRef.current = {
    a,
    c,
    b,
    mode,
    foil,
    seam: buttons.length > 0,
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

    /* ---- layout ----------------------------------------------------------- */
    const padX = 30;
    const WU = (W - padX * 2) / 2.06; // one whole, in px; the shelf spans two
    const x0 = padX;
    const shelfY = S.foil ? H - 148 : H - 96; // the baseline the pieces sit on
    const ph = Math.min(58, H * 0.16); // piece height
    const total = S.mode === 'take' ? S.a : sumCount(S.a, S.c);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* ---- the SAY band: the equation, in symbols then in words ------------- */
    const bandY = 34;
    const fs = Math.min(24, W / 24);
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
    const opGlyph = S.mode === 'take' ? '−' : '+';
    const result = S.mode === 'take' ? takeCount(S.a, S.c) : sumCount(S.a, S.c);
    const soloFrac = S.mode === 'join' && S.c === 0; // one count alone: no "+ 0/b" clutter
    if (soloFrac) {
      drawFrac(W / 2, S.a, S.b, CARMINE);
    } else {
      /* measure the run: frac op frac = frac, then walk a cursor through it */
      const gap = 16;
      const wA = fracW(S.a, S.b);
      const wC = fracW(S.c, S.b);
      const wR = fracW(result, S.b);
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      const wOp = ctx.measureText(opGlyph).width;
      const wEq = ctx.measureText('=').width;
      const runW = wA + gap + wOp + gap + wC + gap + wEq + gap + wR;
      let x = W / 2 - runW / 2;
      drawFrac(x + wA / 2, S.a, S.b, CARMINE);
      x += wA + gap + wOp / 2;
      ctx.fillStyle = INK;
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      ctx.fillText(opGlyph, x, bandY);
      x += wOp / 2 + gap + wC / 2;
      drawFrac(x, S.c, S.b, BLUE);
      x += wC / 2 + gap + wEq / 2;
      ctx.fillStyle = INK;
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      ctx.fillText('=', x, bandY);
      x += wEq / 2 + gap + wR / 2;
      drawFrac(x, result, S.b, CARMINE);
    }
    /* the words beneath — the counting sentence, then the mixed reading */
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 13.5px system-ui, sans-serif';
    const sentence = soloFrac
      ? countWords(S.a, S.b)
      : `${countWords(S.a, S.b)} ${S.mode === 'take' ? '−' : '+'} ${countWords(S.c, S.b)} = ${countWords(result, S.b)}`;
    ctx.fillText(sentence, W / 2, bandY + fs * 1.75);
    const mixed = mixedWords(result, S.b);
    if (mixed) {
      ctx.fillStyle = GOLD;
      ctx.font = '600 13.5px system-ui, sans-serif';
      ctx.fillText(`= ${mixed}`, W / 2, bandY + fs * 1.75 + 20);
    }

    /* ---- the SHELF --------------------------------------------------------- */
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 6, shelfY + 0.5);
    ctx.lineTo(x0 + 2 * WU + 6, shelfY + 0.5);
    ctx.stroke();

    /* gold whole ticks at 1 and 2 wholes */
    for (let wl = 1; wl <= 2; wl++) {
      const tx = x0 + wl * WU;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, shelfY - ph - 26);
      ctx.lineTo(tx, shelfY + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(wl === 1 ? 'one whole' : 'two wholes', tx, shelfY + 18);
    }

    /* pieces: the first count in carmine, then (join) the second in blue.
       In take mode the second count LIFTS off the top of the pile instead. */
    const pw = WU / S.b;
    const drawPiece = (i, color, ghost, lift) => {
      const px = x0 + i * pw;
      const py = shelfY - ph - (lift ? 64 : 0);
      if (ghost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        rr(px + 1, py + 1, pw - 2, ph - 2, 4);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = color;
        rr(px + 1, py + 1, pw - 2, ph - 2, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.35)';
        ctx.lineWidth = 1;
        rr(px + 1, py + 1, pw - 2, ph - 2, 4);
        ctx.stroke();
      }
    };
    if (S.mode === 'take') {
      for (let i = 0; i < S.a - S.c; i++) drawPiece(i, CARMINE, false, false);
      for (let i = S.a - S.c; i < S.a; i++) drawPiece(i, CARMINE, true, true);
      /* the lift arrow */
      if (S.c > 0) {
        const lx = x0 + (S.a - S.c / 2) * pw;
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(lx, shelfY - ph - 6);
        ctx.lineTo(lx, shelfY - ph - 46);
        ctx.stroke();
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.moveTo(lx, shelfY - ph - 50);
        ctx.lineTo(lx - 5, shelfY - ph - 42);
        ctx.lineTo(lx + 5, shelfY - ph - 42);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      for (let i = 0; i < S.a; i++) drawPiece(i, CARMINE, false, false);
      for (let i = S.a; i < S.a + S.c; i++) drawPiece(i, BLUE, false, false);
    }

    /* the label on the first piece: its name, 1/b */
    if (total > 0 && pw > 26) {
      ctx.fillStyle = '#fff';
      ctx.font = `600 ${Math.min(13, pw * 0.36)}px ui-monospace, Menlo, monospace`;
      ctx.fillText(`1/${S.b}`, x0 + pw / 2, shelfY - ph / 2);
    }

    /* brackets over the two runs (join) or the remainder/lift (take) */
    const bracket = (xA, xB, y, label, color) => {
      if (xB - xA < 8) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xA + 1, y + 6);
      ctx.lineTo(xA + 1, y);
      ctx.lineTo(xB - 1, y);
      ctx.lineTo(xB - 1, y + 6);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.fillText(label, (xA + xB) / 2, y - 10);
    };
    if (S.mode === 'take') {
      if (S.a - S.c > 0)
        bracket(x0, x0 + (S.a - S.c) * pw, shelfY - ph - 12, `${S.a - S.c}/${S.b} remain`, CARMINE);
      if (S.c > 0)
        bracket(x0 + (S.a - S.c) * pw, x0 + S.a * pw, shelfY - ph - 76, `take ${S.c}/${S.b} away`, BLUE);
    } else {
      if (S.a > 0) bracket(x0, x0 + S.a * pw, shelfY - ph - 12, `${S.a}/${S.b}`, CARMINE);
      if (S.c > 0) bracket(x0 + S.a * pw, x0 + (S.a + S.c) * pw, shelfY - ph - 12, `${S.c}/${S.b}`, BLUE);
    }

    /* the walking seam (decomposition step): a gold marker at the a|c boundary */
    if (S.seam && S.mode === 'join') {
      const sx = x0 + S.a * pw;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx, shelfY - ph - 4);
      ctx.lineTo(sx, shelfY + 4);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(sx, shelfY - ph - 6);
      ctx.lineTo(sx - 6, shelfY - ph - 16);
      ctx.lineTo(sx + 6, shelfY - ph - 16);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.fillText('the seam', sx, shelfY - ph - 26);
    }

    /* the calib target: a gold flag at the target count */
    if (S.calib && S.target) {
      const tx = x0 + S.target.n * (WU / S.target.d);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(tx, shelfY - ph - 40);
      ctx.lineTo(tx, shelfY + 4);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(`target: ${S.target.n}/${S.target.d}`, tx, shelfY - ph - 52);
    }

    /* ---- the FOIL shelf (lens): the 5/16 error, drawn honestly ------------- */
    if (S.foil && S.mode === 'join') {
      const fy = H - 44;
      ctx.strokeStyle = 'rgba(28,43,58,0.4)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0 - 6, fy + 0.5);
      ctx.lineTo(x0 + 2 * WU + 6, fy + 0.5);
      ctx.stroke();
      const fd = foilDen(S.b);
      const fpw = WU / fd;
      const fph = Math.min(34, ph * 0.66);
      const fn = foilPieces(S.a, S.c);
      for (let i = 0; i < fn; i++) {
        ctx.strokeStyle = 'rgba(28,43,58,0.55)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 3]);
        rr(x0 + i * fpw + 1, fy - fph + 1, fpw - 2, fph - 2, 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `the false rule ${fn}/${fd}: pieces half the size — a shelf half as long`,
        x0 + fn * fpw + 12,
        fy - fph / 2
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
      setA(d.a);
      setC(d.c);
      setB(d.b);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setB(t.d);
      setA(1);
      setC(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const seamLeft = () => {
    if (!canSeamLeft(a, c, b)) return;
    const [na, nc] = seamLeftMove(a, c);
    setA(na);
    setC(nc);
  };
  const seamRight = () => {
    if (!canSeamRight(a, c, b)) return;
    const [na, nc] = seamRightMove(a, c);
    setA(na);
    setC(nc);
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
      setA(d.a);
      setC(d.c);
      setB(d.b);
    } else if (calib) {
      setA(1);
      setC(1);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'size') {
      const nb = clampInt(raw, 2, 12);
      setB(nb);
      setA((v) => Math.min(v, nb));
      setC((v) => Math.min(v, nb));
    } else if (key === 'first') {
      const na = clampInt(raw, 0, b);
      setA(na);
      if (mode === 'take') setC((v) => Math.min(v, na));
    } else {
      setC(clampInt(raw, 0, mode === 'take' ? a : b));
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const resultN = mode === 'take' ? takeCount(a, c) : sumCount(a, c);
  const spoken =
    `${countWords(a, b)} ${mode === 'take' ? 'minus' : 'plus'} ${countWords(c, b)} ` +
    `makes ${countWords(resultN, b)}.` +
    (mixedWords(resultN, b) ? ` That is ${mixedWords(resultN, b)}.` : '') +
    (calib && target ? ` The target is ${target.n} ${pieceWord(target.d, true)}.` : '');

  return (
    <div className="fraddlab">
      <header className="head">
        <h1>Adding Fractions: Counting Pieces</h1>
        <p className="lede">
          A fraction is a <em>count</em> of same-size pieces. When the pieces match, adding is
          just counting on — the tops add and the piece&apos;s <em>name</em> never changes.
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
            {calibrated ? ' Calibrated — the counts add to the target exactly.' : ''}
          </p>

          <div className="toolbar">
            {buttons.includes('left') && (
              <button type="button" className="btn count" onClick={seamLeft} disabled={!canSeamLeft(a, c, b)}>
                ◀ walk the seam
              </button>
            )}
            {buttons.includes('right') && (
              <button type="button" className="btn count" onClick={seamRight} disabled={!canSeamRight(a, c, b)}>
                walk the seam ▶
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
              const value = d.key === 'first' ? a : d.key === 'second' ? c : b;
              const max = d.key === 'size' ? d.max : d.key === 'second' && mode === 'take' ? a : b;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={d.key}>
                  <span className="dk" style={{ color: d.color }}>
                    {d.name}
                  </span>
                  <span className="drole">
                    {unlocked
                      ? d.key === 'second' && mode === 'take'
                        ? 'how many pieces to take away'
                        : d.role
                      : 'unlocks soon'}
                  </span>
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
                <span className="target-k">Build</span>
                <span className="target-word">
                  {target.n}/{target.d}
                </span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${a}/${target.d} + ${c}/${target.d} lands exactly`
                    : `${countWords(target.n, target.d)} — past one whole`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'exactly the target' : sumCount(a, c) > target.n ? 'too many pieces' : 'counting…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">tops must add to {target.n}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setB(t.d);
                  setA(1);
                  setC(1);
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
                  setA(3);
                  setC(0);
                  setB(8);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">3/8 + 2/8 = 5/8 · 6/4 = 1 whole and 2/4</span> &nbsp;·&nbsp; add and
        subtract fractions with like denominators as joining and separating pieces (CCSS 4.NF.B.3);
        the seam decomposes a fraction into sums; the gold tick reads improper counts as mixed
        numbers. The bottoms never add, because a denominator is a <em>name</em>.
      </footer>

      <style jsx>{`
        .fraddlab {
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
            /* minmax(0,1fr), never a bare 1fr — a bare 1fr floors at the
               stage's intrinsic width and blows the lab out sideways on a
               phone (the TeenNumbersLab lesson) */
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
        :global(.fraddlab) :focus-visible {
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
