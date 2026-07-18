'use client';

/* ============================================================================
   FractionMultiplicationLab — an interactive "bench" for MULTIPLYING A
   FRACTION BY A FRACTION, told as the story of THE OVERLAP:

        1/2 × 1/3  =  "one half OF one third"  =  the patch where a shading
        that covers 1/3 of the square CROSSES a shading that covers 1/2 of it
        =  1/6 of the square.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 5 lab —
   CCSS 5.NF.B.4 is the anchor, both clauses:
     • 5.NF.B.4.a  (a/b) × (c/d) = (a·c)/(b·d): interpret the product as a
                   parts of a partition of c/d  (the overlap, counted)
     • 5.NF.B.4.b  a rectangle with fractional side lengths a/b and c/d has
                   area (a·c)/(b·d)  (the overlap IS that rectangle — its two
                   sides are literally the two factors).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "OF MEANS OVERLAP; CROSSING CUTS MINT A NEW
   PIECE."
     One square is THE WHOLE.  A blue shading sweeps ACROSS it, covering c of
     d columns — that is c/d.  A carmine shading sweeps DOWN it, covering a of
     b rows — that is a/b OF whatever it lands on.  The product is not either
     shading: it is the PATCH WHERE THEY CROSS.  And the crossing explains the
     rule no mnemonic can: the two cuts slice the whole into b·d equal cells —
     a NEW, smaller piece that neither factor had — and the overlap holds
     exactly a·c of them, so (a/b) × (c/d) = (a·c)/(b·d).  THIS is why the
     bottoms multiply here although they never add in addition: adding lays
     matching pieces side by side, but "of" cuts the cuts, and cutting twice
     mints the finer piece 1/(b·d).
     The payoff for 5.NF.B.4.b is free: the overlap is itself a rectangle
     whose SIDES are the two factors, so "a 2/3-by-3/4 rectangle covers 6/12
     of the unit square" is read straight off the picture.
     The shrink is confronted, not asserted: taking 1/2 OF 1/3 lands a patch
     visibly smaller than the 1/3 band it was taken from — a part of a part —
     and the deep "multiplication can shrink" story is handed to its own lab
     (ScalingLab) rather than duplicated here.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library, and this corner is
   the most crowded one in it):
     • MultiplicationLab owns a × b as an ARRAY of countable unit squares
       (whole-number factors, discrete tiles).  This lab draws ONE square and
       never tiles it with separate objects: the cells exist only where two
       translucent shadings cross, and no tile is ever counted one by one.
     • AreaLab owns "area is a count of unit squares" and the cut-and-slide.
       Nothing here is measured in unit squares — the whole is 1, every cell
       is a fraction of it, and no shape is ever cut and slid.
     • DistributiveLab owns the rectangle that pulls apart into two tiles.
       This rectangle never separates; nothing here has a gap.
     • FractionLab owns the partitioned BAR (and its pie echo); Fraction-
       AdditionLab owns the piece shelf; FractionTimesWholeLab owns plates.
       No bar, no shelf, no plates: both factors live on ONE square, as
       shadings — the two-dimensional gesture is the whole point.
     • ScalingLab (5.NF.B.5) owns resizing a LENGTH by a factor and the
       "multiplying always makes bigger" misconception in general.  Here the
       shrink appears only as the visible fact that the overlap sits inside
       both bands; no length is scaled and no factor dial crosses 1.

   One-accent discipline, adapted for a two-factor lab: the DOWN factor and
   the PRODUCT are CARMINE (the product is a/b's harvest); the ACROSS factor
   is the restrained BLUE companion; where both land, the deep carmine patch
   is the star.  GOLD marks structure and the capstone target.  GREEN is
   reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • Counts and cuts are INTEGERS: a ≤ b, c ≤ d, all 1…6.  The product is
       the integer pair (a·c, b·d) — never a float, never simplified (6/12
       stays 6/12; renaming is EquivalentFractionsLab's job).
     • The overlap's cell count a·c and the whole's cell count b·d satisfy
       every claim by exhaustive sweep: overlap ≤ each band, overlap = whole
       band exactly when the other factor is 1 (b = a or d = c), and the
       product is smaller than a factor exactly when the other is proper.
     • The calibration stamp is the integer identity a·c === target.  The
       meter reads 100 only at equality (99 is its ceiling everywhere else),
       audited over every target × every reachable (a, c).
   Verified by audit-fractionmultiplication.mjs (numeric proof + source
   greps) and verify-fractionmultiplication.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionMultiplicationLab.jsx
     2. Import and render it:
          import FractionMultiplicationLab from './FractionMultiplicationLab';
          export default function Page() { return <FractionMultiplicationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two factors,
              the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic on cuts and cells; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two factors, each a count and a cut.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the DOWN factor, and the product patch
const BLUE = '#3f74a6'; // the ACROSS factor
const GOLD = '#b98718'; // structure and the capstone target

const DIALS = [
  { key: 'acrossCount', name: 'Across', role: 'columns the blue band covers', min: 1, max: 6, unlock: 0, color: BLUE },
  { key: 'acrossCuts', name: 'Across cuts', role: 'columns the whole is cut into', min: 1, max: 6, unlock: 0, color: BLUE },
  { key: 'downCount', name: 'Down', role: 'rows the carmine band covers', min: 1, max: 6, unlock: 1, color: CARMINE },
  { key: 'downCuts', name: 'Down cuts', role: 'rows the whole is cut into', min: 1, max: 6, unlock: 1, color: CARMINE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Cuts cross; cells are minted; the overlap is counted.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const NUM_W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const PIECE_W = ['', 'whole', 'half', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const pieceWord = (den, plural) => (den === 2 && plural ? 'halves' : PIECE_W[den] + (plural ? 's' : ''));
const countWords = (n, den) =>
  den <= 12 && n <= 12 ? `${NUM_W[n]} ${pieceWord(den, n !== 1)}` : `${n}/${den}`;

/* the two cuts mint b·d cells; the overlap holds a·c of them */
const cells = (b, d) => b * d;
const overlap = (a, c) => a * c;
const productFrac = (a, b, c, d) => ({ n: a * c, den: b * d });

/* exact order facts, by cross products (never floats) */
const lessThan = (p1, q1, p2, q2) => p1 * q2 < p2 * q1;
/* the shrink: (a·c)/(b·d) < c/d exactly when a < b (and c > 0) */
const productShrinksAcross = (a, b, c) => a < b && c > 0;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Shade the target."  The two CUTS are pinned, so
   the grid of cells is fixed; the student chooses how far each band sweeps
   so the overlap covers EXACTLY the target number of cells.  Several sweeps
   work (12 cells on a 4×5 grid: 3×4 or 4×3) — factor pairs, in fraction land.

   No false stamp, provably: CALIBRATED ⟺ a·c === target.t, an integer
   identity with b, d pinned.  The meter reads 100 only at equality (99 is
   its ceiling everywhere else), audited over every target × every (a, c).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let b, d, t;
  do {
    b = 4 + Math.floor(Math.random() * 3); // 4 … 6 row cuts
    d = 4 + Math.floor(Math.random() * 3); // 4 … 6 column cuts
    const a0 = 2 + Math.floor(Math.random() * (b - 2)); // 2 … b−1
    const c0 = 2 + Math.floor(Math.random() * (d - 2)); // 2 … d−1
    t = a0 * c0;
  } while (prev && t === prev.t && b === prev.b && d === prev.d);
  return { t, b, d };
}
const closeness = (p, t, total) =>
  p === t ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(t - p) * 100) / total)));
const isCalibrated = (p, t) => p === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One whole, one band across',
    body:
      'The square is ONE WHOLE. Cut it into 3 columns and sweep the blue band across 1 of ' +
      'them: the band covers 1/3 of the square. Slide the across dials and watch the band.',
    demo: { a: 1, b: 1, c: 1, d: 3 },
    q: 'The blue band covers…',
    choices: ['1/3 of the whole square', '1/3 of the blue band', 'one whole column, so 1 whole'],
    answer: 0,
    feedback:
      'One third OF THE WHOLE SQUARE — the bottom number always talks about the whole. One ' +
      'column is a third because three of them fill the square. Keep your eye on the square: ' +
      'everything in this lab is a fraction of IT.',
  },
  {
    title: 'A second band, straight down',
    body:
      'The down dials are unlocked. Cut the square into 2 rows and sweep the carmine band ' +
      'down across 1 of them. The two bands CROSS — look at the doubly-shaded patch.',
    demo: { a: 1, b: 2, c: 1, d: 3 },
    q: 'The deep patch where the two bands cross is…',
    choices: ['1/2 OF the 1/3 band — a part of a part', '1/2 of the whole square', 'the same as the 1/3 band'],
    answer: 0,
    feedback:
      '"Of" means overlap: the carmine band takes 1/2 of everything it crosses, so where it ' +
      'crosses the 1/3 band, the patch is 1/2 OF 1/3. That is what fraction × fraction MEANS — ' +
      'not a rule yet, just a patch. Next step, we count it.',
  },
  {
    title: 'The cuts mint a new piece',
    body:
      'Count what the crossing did: 2 row-cuts × 3 column-cuts slice the whole into 6 equal ' +
      'cells — a piece size NEITHER factor had. The overlap holds exactly 1 of them.',
    demo: { a: 1, b: 2, c: 1, d: 3 },
    lens: { cells: true },
    q: '1/2 × 1/3 = ?',
    choices: ['1/6', '5/6', '2/5'],
    answer: 0,
    feedback:
      'One sixth. The cuts cross, mint sixths (2 × 3 = 6 cells), and the overlap holds 1 × 1 = ' +
      '1 of them: (1·1)/(2·3) = 1/6. THIS is why the bottoms multiply here although they never ' +
      'add in addition: adding lays matching pieces side by side; "of" cuts the cuts. (5/6 is ' +
      '1/2 + 1/3 — the plus habit; 2/5 adds tops and bottoms.)',
  },
  {
    title: 'The overlap is a rectangle',
    body:
      'Read the patch itself: its two SIDES are exactly the two factors — 2/3 down, 3/4 ' +
      'across. A rectangle with fractional sides, and its size is read in cells.',
    demo: { a: 2, b: 3, c: 3, d: 4 },
    lens: { sides: true },
    q: 'A patch with sides 2/3 and 3/4 covers…',
    choices: ['6/12 of the whole — count the cells: 2 × 3 of 3 × 4', '5/7 of the whole', '6/7 of the whole'],
    answer: 0,
    feedback:
      'Six twelfths: the cuts mint 3 × 4 = 12 cells and the patch holds 2 × 3 = 6. That is ' +
      'CCSS 5.NF.B.4.b in one picture — a rectangle with sides a/b and c/d covers (a·c)/(b·d) ' +
      'of the whole square. (And 6/12 stays 6/12 here — renaming it is another lab’s story.)',
  },
  {
    title: 'A part of a part is smaller',
    body:
      'Look where the product patch sits: INSIDE the blue band, and INSIDE the carmine band. ' +
      'Taking 1/2 of 1/3 left less than the 1/3 you started with.',
    demo: { a: 1, b: 2, c: 1, d: 3 },
    q: 'Compared with the 1/3 band it was taken from, the patch 1/2 × 1/3 is…',
    choices: ['Smaller — taking a part of something cannot grow it', 'The same size', 'Bigger — multiplying always grows things'],
    answer: 0,
    feedback:
      'Smaller: 1/6 is half of 1/3, and the picture shows it — the patch is the part of the ' +
      'band the carmine sweep kept. Multiplying by a proper fraction SHRINKS. (When and why ' +
      'multiplication shrinks or grows in general is a whole story of its own — the Scaling ' +
      'lab owns it.)',
  },
  {
    title: 'The garden problem',
    body:
      '2/3 of a garden is planted (blue, across). 3/4 of the planted part is tomatoes ' +
      '(carmine, down). The tomato patch is the overlap — read it in cells.',
    demo: { a: 3, b: 4, c: 2, d: 3 },
    q: 'What fraction of the WHOLE garden is tomatoes?',
    choices: ['6/12 — the overlap: 3 × 2 of the 4 × 3 cells', '3/4 — the tomato share', '2/3 — the planted share'],
    answer: 0,
    feedback:
      'Six twelfths of the whole garden: 3/4 × 2/3 = (3·2)/(4·3) = 6/12. The question every ' +
      'word problem hides is "fraction OF WHAT?" — 3/4 talks about the planted part, but the ' +
      'answer must talk about the whole garden, and only the overlap does.',
  },
  {
    title: 'Shade the target',
    body:
      'The cuts are pinned — the grid of cells is fixed. Sweep the two bands so the overlap ' +
      'covers EXACTLY the target number of cells. More than one pair of sweeps works.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionMultiplicationLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [c, setC] = useState(1);
  const [d, setD] = useState(3);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const lens = current.lens || {};

  const oc = overlap(a, c);
  const tc = cells(b, d);
  const pct = calib && target != null ? closeness(oc, target.t, cells(target.b, target.d)) : 0;
  const calibrated = calib && target != null ? isCalibrated(oc, target.t) : false;

  sceneRef.current = {
    a,
    b,
    c,
    d,
    showCells: !calib && !!lens.cells,
    showSides: !calib && !!lens.sides,
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

    const oCells = overlap(S.a, S.c);
    const wCells = cells(S.b, S.d);
    const prod = productFrac(S.a, S.b, S.c, S.d);

    /* ---- the SAY band ------------------------------------------------------ */
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
      const gap = 13;
      const segs = [
        { kind: 'frac', num: S.a, den: S.b, color: CARMINE },
        { kind: 'text', s: '×', color: INK },
        { kind: 'frac', num: S.c, den: S.d, color: BLUE },
        { kind: 'text', s: '=', color: INK },
        { kind: 'frac', num: prod.n, den: prod.den, color: CARMINE },
      ];
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
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
      `${countWords(S.a, S.b)} of ${countWords(S.c, S.d)} — ${countWords(prod.n, prod.den)} of the whole`,
      W / 2,
      bandY + fs * 1.8
    );

    /* ---- the SQUARE (the whole) -------------------------------------------- */
    const topY = bandY + fs * 1.8 + 26;
    const SQ = Math.min(W * 0.52, H - topY - 64);
    const x0 = (W - SQ) / 2;
    const y0 = topY + (H - topY - 64 - SQ) / 2 + 6;

    /* the across band (blue): c of d columns, full height */
    const colW = SQ / S.d;
    ctx.fillStyle = 'rgba(63,116,166,0.25)';
    ctx.fillRect(x0, y0, S.c * colW, SQ);
    /* the down band (carmine): a of b rows, full width */
    const rowH = SQ / S.b;
    ctx.fillStyle = 'rgba(200,30,79,0.22)';
    ctx.fillRect(x0, y0, SQ, S.a * rowH);
    /* the overlap: deep carmine */
    ctx.fillStyle = 'rgba(200,30,79,0.52)';
    ctx.fillRect(x0, y0, S.c * colW, S.a * rowH);

    /* the cuts (they cross the WHOLE square) */
    ctx.strokeStyle = 'rgba(63,116,166,0.65)';
    ctx.lineWidth = 1.2;
    for (let j = 1; j < S.d; j++) {
      ctx.beginPath();
      ctx.moveTo(x0 + j * colW, y0);
      ctx.lineTo(x0 + j * colW, y0 + SQ);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(200,30,79,0.6)';
    for (let i = 1; i < S.b; i++) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + i * rowH);
      ctx.lineTo(x0 + SQ, y0 + i * rowH);
      ctx.stroke();
    }
    /* the whole's outline, always on top */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, SQ, SQ);

    /* the cells lens: badge the mint */
    if (S.showCells || S.calib) {
      ctx.fillStyle = INK;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.fillText(
        `${S.b} × ${S.d} = ${wCells} cells — the overlap holds ${S.a} × ${S.c} = ${oCells}`,
        W / 2,
        y0 + SQ + 24
      );
    }

    /* the sides lens: the overlap rectangle's sides ARE the factors */
    if (S.showSides && oCells > 0) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x0 + 1.5, y0 + 1.5, S.c * colW - 3, S.a * rowH - 3);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, Menlo, monospace';
      ctx.save();
      ctx.translate(x0 - 16, y0 + (S.a * rowH) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${S.a}/${S.b}`, 0, 0);
      ctx.restore();
      ctx.fillStyle = BLUE;
      ctx.fillText(`${S.c}/${S.d}`, x0 + (S.c * colW) / 2, y0 - 14);
    }

    /* band brackets */
    ctx.fillStyle = BLUE;
    ctx.font = '600 12.5px system-ui, sans-serif';
    if (!S.showSides) ctx.fillText(`${S.c}/${S.d} across`, x0 + (S.c * colW) / 2, y0 - 14);
    ctx.fillStyle = CARMINE;
    ctx.save();
    ctx.translate(x0 + SQ + 16, y0 + (S.a * rowH) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${S.a}/${S.b} down`, 0, 0);
    ctx.restore();

    /* the product label inside the overlap, when it fits */
    if (oCells > 0 && S.c * colW > 60 && S.a * rowH > 34) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.min(17, (S.c * colW) * 0.16)}px ui-monospace, Menlo, monospace`;
      ctx.fillText(`${prod.n}/${prod.den}`, x0 + (S.c * colW) / 2, y0 + (S.a * rowH) / 2);
    }

    /* the capstone target chip */
    if (S.calib && S.target) {
      ctx.fillStyle = GOLD;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(`target: cover ${S.target.t} of the ${wCells} cells`, W / 2, y0 - 34);
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
    const dm = STEPS[step].demo;
    if (dm) {
      setA(dm.a);
      setB(dm.b);
      setC(dm.c);
      setD(dm.d);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setB(t.b);
      setD(t.d);
      setA(1);
      setC(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction ------------------------------------------------------- */
  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const dm = current.demo;
    if (dm) {
      setA(dm.a);
      setB(dm.b);
      setC(dm.c);
      setD(dm.d);
    } else if (calib) {
      setA(1);
      setC(1);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'downCuts') {
      const nb = clampInt(raw, 1, 6);
      setB(nb);
      setA((v) => Math.min(v, nb));
    } else if (key === 'downCount') setA(clampInt(raw, 1, b));
    else if (key === 'acrossCuts') {
      const nd = clampInt(raw, 1, 6);
      setD(nd);
      setC((v) => Math.min(v, nd));
    } else setC(clampInt(raw, 1, d));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `${countWords(a, b)} of ${countWords(c, d)} is ${countWords(oc, tc)} of the whole.` +
    (calib && target ? ` The target is ${target.t} of ${cells(target.b, target.d)} cells.` : '');

  return (
    <div className="fmullab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>A Fraction of a Fraction</h1>
        <p className="lede">
          &quot;Of&quot; means <em>overlap</em>: shade 1/3 across, then 1/2 down — the patch where
          the bands cross is 1/2 × 1/3. The crossing cuts mint a <em>new, smaller piece</em>, and
          that is why the bottoms multiply.
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
            {calibrated ? ' Calibrated — the overlap covers the target exactly.' : ''}
          </p>

          <div className="toolbar">
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
            {DIALS.filter((dl) => !(calib && (dl.key === 'downCuts' || dl.key === 'acrossCuts'))).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value =
                dl.key === 'downCount' ? a : dl.key === 'downCuts' ? b : dl.key === 'acrossCount' ? c : d;
              const max = dl.key === 'downCount' ? b : dl.key === 'acrossCount' ? d : dl.max;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={max}
                    step={1}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${dl.role}`}
                    onChange={(e) => setDial(dl.key, e.target.value)}
                    style={{ accentColor: dl.color }}
                  />
                  <output className="dv" style={unlocked ? { color: dl.color } : undefined}>
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
                <span className="target-k">Cover exactly</span>
                <span className="target-word">
                  {target.t} of {cells(target.b, target.d)} cells
                </span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${a}/${target.b} × ${c}/${target.d} = ${oc}/${tc} — exactly the target`
                    : `the grid is cut ${target.b} × ${target.d}; sweep both bands`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'covered exactly' : oc > target.t ? 'too many cells' : 'sweeping…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {a} × {c} = {oc} of {target.t}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setB(t.b);
                  setD(t.d);
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
                  setA(1);
                  setB(1);
                  setC(1);
                  setD(3);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">1/2 × 1/3 = 1/6 · sides 2/3 and 3/4 → 6/12</span> &nbsp;·&nbsp;
        multiply fractions by crossing shadings: the cuts mint b·d cells and the overlap holds a·c
        (CCSS 5.NF.B.4.a); the overlap is itself a rectangle whose sides are the factors
        (5.NF.B.4.b). The bottoms multiply <em>because</em> the cuts cross — a part of a part is a
        finer piece.
      </footer>

      <style jsx>{`
        .fmullab {
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
          font-size: 26px;
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
        :global(.fmullab) :focus-visible {
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
