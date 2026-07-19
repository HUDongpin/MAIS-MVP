'use client';

/* ============================================================================
   UnlikeDenominatorsLab — an interactive "bench" for ADDING AND SUBTRACTING
   FRACTIONS WITH UNLIKE DENOMINATORS: pieces of different sizes refuse to be
   counted together until BOTH are re-sliced to one common size.

        1/2 + 1/3  =  ?          the counts mean nothing yet —
        3/6 + 2/6  =  5/6        cut every whole into sixths, and they add.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 5 lab —
   CCSS 5.NF.A.1 is the anchor (add and subtract fractions with unlike
   denominators by replacing them with equivalent fractions that share a
   denominator; a/b + c/d = (ad + bc)/bd is the always-works cut, written
   out), with 5.NF.A.2 carried along (estimate: recognise 2/5 + 1/2 = 3/7 as
   absurd, because the "answer" is smaller than one of the addends).

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE JOINT THAT REFUSES."
     Two runs of pieces — carmine halves, blue thirds — butt together on one
     long rail, and the equation band shows  1/2 + 1/3 = ? : the readout is
     SELF-GATING and stays silent while the piece sizes differ, because a
     count of mixed-size pieces genuinely means nothing.  (The precedent is
     LengthComparisonLab's verdict-that-refuses-an-unfair-race and
     ComposingShapesLab's self-gating ledger: an arithmetic claim a child can
     see is wrong is worse than no claim.)  The CUT dial slices every whole
     into k; the gold cut lines fall INSIDE the existing pieces — the amounts
     never move — and the instant k is a size BOTH denominators divide, every
     piece on the rail is the same 1/k, the joint reads, and adding is just
     counting again.  A cut that serves only one run (fourths, for 1/2 + 1/3)
     leaves the joint silent, and the miss is named on screen: finding the
     common cut IS the mathematics of this lab.
     The star exhibit is the MEDIANT FOIL, 1/2 + 1/3 = 2/5 ("add tops, add
     bottoms"): the 2/5 run is laid beneath the rail and measures SHORTER
     THAN THE 1/2 ALONE.  Adding a real amount cannot land below an addend —
     the wrong rule is not lectured against; it is measured, and it breaks
     arithmetic in plain sight.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • FractionAdditionLab (4.NF.B.3) owns LIKE-denominator joining: the
       two-colour shelf, the walking seam, the add-the-bottoms foil at the
       SAME size.  This lab's whole subject is what that lab never meets —
       the refusal, the cut, and the choice of a common size.  If the two
       piece sizes are set equal here, the joint simply reads at once and
       says so: that easy case belongs to the sibling.
     • LCMLab owns the least common multiple as a RE-SYNC PERIOD of two
       spinning wheels; MultiplesLab owns skip-counting a number line.  This
       lab never draws a wheel, a tick of time, or a number line: common
       multiples appear only as CUTS THAT LAND ON BOTH RUNS, the smallest one
       is found by hunting, and the initialism "LCM" is never taught here.
     • GreatestCommonFactorLab owns the shared-factor Venn of prime bricks.
       No factor diagram appears; divisibility is something the cut lines
       physically hit or miss.
     • EquivalentFractionsLab owns renaming as its OBJECT (the name lattice).
       Here renaming is a TOOL used once per problem, the result is never
       simplified (3/6 + 2/6 = 5/6 stays 5/6 even when a shorter name
       exists), and no lattice or ray appears.
     • FractionLab owns the partitioned whole with its split dial.  This
       lab's cut serves ADDITION and must serve two runs at once; no single
       bar is partitioned and no pie appears.

   One-accent discipline, adapted for a two-addend lab: the FIRST count is
   CARMINE, the SECOND is the restrained BLUE companion.  GOLD is THE CUT —
   the tool the lab exists to teach — plus the whole tick.  The foil run is
   slate (a wrong idea is never the accent).  GREEN is reserved for "correct"
   and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • Counts and sizes are INTEGERS.  A re-cut count is a·(k/b), computed
       only when b divides k, so it is always an exact integer — the model
       never divides fractions into floats.
     • The joint reads  (a·k/b + c·k/d)/k,  and the audit proves the exact
       rational identity  n·(b·d) === k·(a·d + c·b)  for every setting — the
       drawn sum IS (ad + bc)/bd in disguise, always.
     • Subtraction is gated by the exact cross-product test a·d ≥ c·b; the
       rail never shows a negative count.
     • The mediant foil (a+c)/(b+d) is proved (by cross products) to sit
       strictly BETWEEN the two addends whenever they differ — which is why
       it can never be their sum.
     • The calibration stamp is the divisibility identity  k mod b === 0 AND
       k mod d === 0.  The meter reads 100 only then (50 when one run is
       served, 0 otherwise), audited over every pair × every cut.
   Verified by audit-unlikedenominators.mjs (numeric proof + source greps)
   and verify-unlikedenominators.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/UnlikeDenominatorsLab.jsx
     2. Import and render it:
          import UnlikeDenominatorsLab from './UnlikeDenominatorsLab';
          export default function Page() { return <UnlikeDenominatorsLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the two fractions,
              the cut k, the lesson step, answers, the challenge pair).
     MODEL  — pure integer arithmetic: divisibility, re-cut counts, cross
              products; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two fractions (count + size each) and THE CUT.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the first count
const BLUE = '#3f74a6'; // the second count
const GOLD = '#b98718'; // THE CUT — the tool this lab exists to teach
const SLATE = '#5b6b7b'; // the foil run

const DIALS = [
  { key: 'a', name: 'First count', role: 'pieces in the first run', min: 1, max: 5, unlock: 0, color: CARMINE },
  { key: 'b', name: 'First size', role: 'pieces of this size fill one whole', min: 2, max: 6, unlock: 0, color: CARMINE },
  { key: 'c', name: 'Second count', role: 'pieces in the second run', min: 1, max: 5, unlock: 0, color: BLUE },
  { key: 'd', name: 'Second size', role: 'pieces of this size fill one whole', min: 2, max: 6, unlock: 0, color: BLUE },
  { key: 'cut', name: 'The cut', role: 'slice every whole into this many', min: 0, max: 36, unlock: 2, color: GOLD },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Divisibility, exact re-cut counts, cross products.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

const PIECE_W = ['', '', 'half', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const NUM_W = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve',
];
const pieceWord = (b, plural) => (b === 2 && plural ? 'halves' : PIECE_W[b] + (plural ? 's' : ''));
const countWords = (n, den) =>
  den <= 12 && n <= 12 ? `${NUM_W[n]} ${pieceWord(den, n !== 1)}` : `${n}/${den}`;

/* a cut lands on a run when the piece size divides it */
const cutWorks = (k, b) => k > 0 && k % b === 0;
const bothCut = (k, b, d) => cutWorks(k, b) && cutWorks(k, d);
/* re-slicing 1/b pieces into 1/k turns a of them into a·(k/b) — exact only
   when b divides k, which is the only time the model computes it */
const recut = (a, b, k) => a * (k / b);
/* the smallest cut that serves both runs, found honestly by hunting */
const smallestCut = (b, d) => {
  let k = Math.max(b, d);
  while (k % b !== 0 || k % d !== 0) k++;
  return k;
};
/* the joint: reads a count only when every piece on the rail is one size */
const joinRead = (a, b, c, d, k) => {
  if (b === d) return { n: a + c, den: b };
  if (bothCut(k, b, d)) return { n: recut(a, b, k) + recut(c, d, k), den: k };
  return null;
};
/* subtraction: gated by the exact cross-product comparison a/b ≥ c/d */
const atLeast = (a, b, c, d) => a * d >= c * b;
const takeRead = (a, b, c, d, k) => {
  if (!atLeast(a, b, c, d)) return null;
  if (b === d) return { n: a - c, den: b };
  if (bothCut(k, b, d)) return { n: recut(a, b, k) - recut(c, d, k), den: k };
  return null;
};
/* the mediant foil: "add tops, add bottoms" */
const mediantNum = (a, c) => a + c;
const mediantDen = (b, d) => b + d;
const lessThan = (p1, q1, p2, q2) => p1 * q2 < p2 * q1; // p1/q1 < p2/q2, exactly
/* the mixed reading of the joint's count */
const toMixed = (n, den) => ({ w: Math.floor(n / den), r: n % den });

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Find a cut that serves both runs."  The problem
   pair is pinned; only THE CUT moves.  Hunting a working k is the whole act
   of finding a common denominator, made physical.

   No false stamp, provably: CALIBRATED ⟺ k mod b === 0 AND k mod d === 0 —
   a pair of integer divisibility identities.  The meter reads 100 only then
   (50 when exactly one run is served, 0 otherwise), audited over every pair
   × every cut in range.  Every pair admits a working cut ≤ 30 ≤ 36.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let a, b, c, d;
  do {
    b = 2 + Math.floor(Math.random() * 5); // 2 … 6
    do {
      d = 2 + Math.floor(Math.random() * 5);
    } while (d === b);
    a = 1 + Math.floor(Math.random() * (b - 1)); // 1 … b−1 (proper)
    c = 1 + Math.floor(Math.random() * (d - 1)); // 1 … d−1 (proper)
  } while (prev && a === prev.a && b === prev.b && c === prev.c && d === prev.d);
  return { a, b, c, d };
}
const closeness = (k, b, d) => (cutWorks(k, b) ? 50 : 0) + (cutWorks(k, d) ? 50 : 0);
const isCalibrated = (k, b, d) => bothCut(k, b, d);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Pieces that do not match',
    body:
      'A half and a third meet on the rail — and the answer window shows nothing. Look at the ' +
      'junction: the pieces are different sizes, so counting them together means nothing yet.',
    demo: { a: 1, b: 2, c: 1, d: 3, k: 0 },
    q: '1/2 + 1/3 — can you add the tops straight away?',
    choices: [
      'No — the pieces are different sizes, so "1 + 1" counts nothing',
      'Yes — 1 + 1 = 2 and 2 + 3 = 5, so 2/5',
      'Yes — keep the bigger bottom: 2/3',
    ],
    answer: 0,
    feedback:
      'No. A count only means something when every piece is the same size — one HALF and one ' +
      'THIRD are two pieces, but two of WHAT? The rail refuses to answer until the pieces ' +
      'match. And 2/5 is about to be measured on the next step — watch it embarrass itself.',
  },
  {
    title: 'The wrong rule breaks arithmetic',
    body:
      'The slate run below is the classic "add tops, add bottoms" answer, 2/5. Compare it with ' +
      'the carmine bracket — the 1/2 you started with, alone.',
    demo: { a: 1, b: 2, c: 1, d: 3, k: 0 },
    lens: { foil: true },
    q: 'The claimed sum 2/5, compared with the addend 1/2 alone, is…',
    choices: [
      'Shorter — so 2/5 cannot possibly be the sum',
      'Exactly equal — so it might be right',
      'Longer — adding something made it grow',
    ],
    answer: 0,
    feedback:
      'Shorter. You started with 1/2, ADDED a real amount, and the "answer" 2/5 is LESS than ' +
      '1/2 (check exactly: 2×2 = 4 is less than 5×1 = 5). A sum must reach past both addends. ' +
      'Adding tops and bottoms lands between them instead — it can never be the sum.',
  },
  {
    title: 'The cut',
    body:
      'THE CUT is unlocked. Slice every whole into 6: the gold lines fall inside the existing ' +
      'pieces — nothing moves — and suddenly every piece on the rail is a sixth. Read the joint.',
    demo: { a: 1, b: 2, c: 1, d: 3, k: 6 },
    q: 'Cut every whole into 6 — the half becomes…',
    choices: ['3/6 — the same amount, in sixths', '6/2 — six halves', '1/6 — one sixth'],
    answer: 0,
    feedback:
      'Three sixths. The cut does not change the amount — it changes the NAME: 1/2 = 3/6 and ' +
      '1/3 = 2/6. Now every piece is a sixth, and adding is counting again: 3 + 2 = 5, so ' +
      '1/2 + 1/3 = 5/6. Matching the pieces first is the whole method.',
  },
  {
    title: 'Cuts that miss',
    body:
      'Try a cut of 4. It lands cleanly on the halves — but slices the thirds into ragged ' +
      'non-equal bits, so the joint still refuses. Slide the cut and watch which sizes work.',
    demo: { a: 1, b: 2, c: 1, d: 3, k: 4 },
    q: 'For 1/2 + 1/3, which cuts make BOTH runs readable?',
    choices: [
      '6, 12, 18, … — any size that both 2 and 3 go into evenly',
      'Any even size — 4, 6, 8, 10, …',
      'Only 6 works, and nothing else ever will',
    ],
    answer: 0,
    feedback:
      'Any size both 2 and 3 divide: 6, 12, 18, … A cut of 4 serves the halves and misses the ' +
      'thirds. 6 is the SMALLEST size that serves both — the tidiest choice — but 12 works ' +
      'perfectly too (6/12 + 4/12 = 10/12). Try it on the dial.',
  },
  {
    title: 'The cut that always works',
    body:
      'For 1/4 + 1/6, multiplying the two sizes gives a cut of 4 × 6 = 24 — it always serves ' +
      'both runs. The scene shows it. But is it the smallest?',
    demo: { a: 1, b: 4, c: 1, d: 6, k: 24 },
    q: '24 always works for fourths and sixths. Is it the smallest working cut?',
    choices: ['No — 12 already serves both', 'Yes — nothing below 24 works', 'No — 10 already serves both'],
    answer: 0,
    feedback:
      'Twelve already works: 3/12 + 2/12 = 5/12 — slide the cut to 12 and watch. Multiplying ' +
      'the sizes (b × d) ALWAYS gives a working cut — that is the formula a/b + c/d = ' +
      '(ad + cb)/(bd) in the flesh — it just sometimes over-slices. 10 misses both runs.',
  },
  {
    title: 'Taking away, unlike',
    body:
      'Subtraction needs matching pieces too. Three fourths sit on the rail; take away a half. ' +
      'The cut of 4 turns the half into 2/4 — and the lift can finally count.',
    demo: { a: 3, b: 4, c: 1, d: 2, k: 4 },
    mode: 'take',
    q: '3/4 − 1/2 = ?',
    choices: ['1/4', '2/2 — one whole', '2/4'],
    answer: 0,
    feedback:
      'One fourth. Cut the half into fourths (1/2 = 2/4), lift two fourths off the three, and ' +
      'one fourth remains. "Subtract tops, subtract bottoms" gives 2/2 = 1 — MORE than the 3/4 ' +
      'you started with, which no taking-away can do. The mismatched rule fails both ways.',
  },
  {
    title: 'Find the cut',
    body:
      'A pinned problem waits on the rail. Only THE CUT moves now. Hunt for a size that serves ' +
      'both runs — the moment the joint reads, you have built a common denominator.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function UnlikeDenominatorsLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(3);
  const [k, setK] = useState(0);
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

  const read = mode === 'take' ? takeRead(a, b, c, d, k) : joinRead(a, b, c, d, k);
  const stamped = calib ? isCalibrated(k, b, d) : false;
  const pct = calib ? closeness(k, b, d) : 0;

  sceneRef.current = { a, b, c, d, k, mode, foil, calib, read, stamped };

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

    /* ---- the SAY band: a/b ± c/d = ⍰ or n/k, then the story --------------- */
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
    const op = S.mode === 'take' ? '−' : '+';
    {
      const gap = 13;
      const segs = [
        { kind: 'frac', num: S.a, den: S.b, color: CARMINE },
        { kind: 'text', s: op, color: INK },
        { kind: 'frac', num: S.c, den: S.d, color: BLUE },
        { kind: 'text', s: '=', color: INK },
      ];
      if (S.read) segs.push({ kind: 'frac', num: S.read.n, den: S.read.den, color: CARMINE });
      else segs.push({ kind: 'text', s: '?', color: INK_SOFT });
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
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    if (S.read) {
      ctx.fillStyle = INK_SOFT;
      const renamed =
        S.b !== S.d && S.read.den !== S.b
          ? `${recut(S.a, S.b, S.read.den)}/${S.read.den} ${op} ${recut(S.c, S.d, S.read.den)}/${S.read.den} = ${S.read.n}/${S.read.den} — every piece the same size`
          : `like pieces already — just count`;
      ctx.fillText(renamed, W / 2, bandY + fs * 1.8);
      const mx = toMixed(S.read.n, S.read.den);
      if (mx.w > 0) {
        ctx.fillStyle = GOLD;
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(
          mx.r === 0 ? `= ${mx.w} whole${mx.w > 1 ? 's' : ''} exactly` : `= ${mx.w} whole and ${mx.r}/${S.read.den}`,
          W / 2,
          bandY + fs * 1.8 + 19
        );
      }
    } else {
      ctx.fillStyle = SLATE;
      const why =
        S.mode === 'take' && !atLeast(S.a, S.b, S.c, S.d)
          ? 'not enough on the rail to take that away'
          : S.k === 0
            ? 'the joint refuses — the pieces are different sizes'
            : `the cut of ${S.k} ${cutWorks(S.k, S.b) ? 'serves' : 'misses'} the ${pieceWord(S.b, true)} and ${
                cutWorks(S.k, S.d) ? 'serves' : 'misses'
              } the ${pieceWord(S.d, true)}`;
      ctx.fillText(why, W / 2, bandY + fs * 1.8);
    }

    /* ---- the two ADDEND runs (small, above the rail) ----------------------- */
    const WUs = Math.min(170, W * 0.24); // a small whole, for the addend runs
    const runY = 128;
    const runH = 30;
    const drawRun = (x, count, size, color, label) => {
      const pw = WUs / size;
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = color;
        rr(x + i * pw + 1, runY + 1, pw - 2, runH - 2, 3);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.font = '600 12px ui-monospace, Menlo, monospace';
      ctx.fillText(label, x + (count * pw) / 2, runY + runH + 14);
    };
    drawRun(W / 2 - WUs - 40, S.a, S.b, CARMINE, `${S.a}/${S.b}`);
    drawRun(W / 2 + 40, S.c, S.d, BLUE, `${S.c}/${S.d}`);

    /* ---- THE RAIL: both runs butt together at true size -------------------- */
    const padX = 36;
    const WU = (W - padX * 2) / 2.05; // one whole on the rail
    const x0 = padX;
    const railY = S.foil ? H - 190 : H - 130;
    const ph = 52;
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 8, railY + ph + 4.5);
    ctx.lineTo(x0 + 2 * WU + 8, railY + ph + 4.5);
    ctx.stroke();

    /* gold whole tick */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 + WU, railY - 22);
    ctx.lineTo(x0 + WU, railY + ph + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GOLD;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('one whole', x0 + WU, railY + ph + 20);

    const firstW = S.a * (WU / S.b);
    const secondW = S.c * (WU / S.d);
    const lifted = S.mode === 'take';
    /* first run on the rail */
    for (let i = 0; i < S.a; i++) {
      const pw = WU / S.b;
      ctx.fillStyle = CARMINE;
      rr(x0 + i * pw + 1, railY + 1, pw - 2, ph - 2, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.35)';
      ctx.lineWidth = 1;
      rr(x0 + i * pw + 1, railY + 1, pw - 2, ph - 2, 4);
      ctx.stroke();
    }
    /* second run: joins on the rail, or hovers to be taken away */
    {
      const pw = WU / S.d;
      const sy = lifted ? railY - 74 : railY;
      const sx = lifted ? x0 + firstW - secondW : x0 + firstW;
      for (let i = 0; i < S.c; i++) {
        ctx.fillStyle = lifted ? 'rgba(63,116,166,0.25)' : BLUE;
        rr(sx + i * pw + 1, sy + 1, pw - 2, ph - 2, 4);
        ctx.fill();
        ctx.strokeStyle = lifted ? BLUE : 'rgba(28,43,58,0.35)';
        ctx.lineWidth = lifted ? 1.4 : 1;
        if (lifted) ctx.setLineDash([4, 3]);
        rr(sx + i * pw + 1, sy + 1, pw - 2, ph - 2, 4);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (lifted) {
        ctx.fillStyle = BLUE;
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(`take ${S.c}/${S.d} away`, sx + secondW / 2, sy - 14);
      }
    }

    /* the junction: jagged when unlike and unread */
    if (!S.read && S.b !== S.d && !lifted) {
      const jx = x0 + firstW;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let zy = railY - 8;
      ctx.moveTo(jx, zy);
      for (let i = 0; i < 5; i++) {
        zy += (ph + 16) / 5;
        ctx.lineTo(jx + (i % 2 === 0 ? 6 : -6), zy);
      }
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('✂ sizes clash', jx, railY - 20);
    }

    /* THE CUT: gold lines every 1/k across both wholes of the rail */
    if (S.k > 0) {
      const kw = WU / S.k;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4;
      for (let i = 0; i <= 2 * S.k; i++) {
        const cx = x0 + i * kw;
        ctx.beginPath();
        ctx.moveTo(cx, railY - (i % S.k === 0 ? 14 : 6));
        ctx.lineTo(cx, railY);
        ctx.stroke();
      }
      ctx.fillStyle = GOLD;
      ctx.font = '600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`the cut: every whole into ${S.k}`, x0, railY - 26);
      ctx.textAlign = 'center';
      /* when the cut serves a run, its pieces show the internal gold slices */
      const slice = (startX, count, size) => {
        if (!cutWorks(S.k, size)) return;
        const per = S.k / size;
        const pw = WU / size;
        for (let i = 0; i < count; i++)
          for (let j = 1; j < per; j++) {
            const sx = startX + i * pw + (j * pw) / per;
            ctx.strokeStyle = 'rgba(185,135,24,0.9)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(sx, railY + 3);
            ctx.lineTo(sx, railY + ph - 3);
            ctx.stroke();
          }
      };
      slice(x0, S.a, S.b);
      if (!lifted) slice(x0 + firstW, S.c, S.d);
      else slice(x0 + firstW - secondW, S.c, S.d);
    }

    /* the read bracket: count the same-size pieces */
    if (S.read && S.mode === 'join') {
      const endX = x0 + firstW + secondW;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x0 + 1, railY - 36);
      ctx.lineTo(x0 + 1, railY - 42);
      ctx.lineTo(endX - 1, railY - 42);
      ctx.lineTo(endX - 1, railY - 36);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${S.read.n}/${S.read.den}`, (x0 + endX) / 2, railY - 52);
    }
    if (S.read && S.mode === 'take') {
      const remW = firstW - secondW;
      if (remW > 4) {
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x0 + 1, railY + ph + 12);
        ctx.lineTo(x0 + 1, railY + ph + 18);
        ctx.lineTo(x0 + remW - 1, railY + ph + 18);
        ctx.lineTo(x0 + remW - 1, railY + ph + 12);
        ctx.stroke();
        ctx.fillStyle = CARMINE;
        ctx.font = '700 13px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${S.read.n}/${S.read.den} remain`, x0, railY + ph + 34);
        ctx.textAlign = 'center';
      }
    }

    /* ---- the MEDIANT FOIL (lens): measured against the bigger addend ------- */
    if (S.foil) {
      const fy = H - 92;
      const fn = mediantNum(S.a, S.c);
      const fd = mediantDen(S.b, S.d);
      const fpw = WU / fd;
      for (let i = 0; i < fn; i++) {
        ctx.strokeStyle = SLATE;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 3]);
        rr(x0 + i * fpw + 1, fy + 1, fpw - 2, 30, 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the bigger addend's reach, bracketed above the foil */
      const firstBigger = !lessThan(S.a, S.b, S.c, S.d);
      const bigW = (firstBigger ? S.a / S.b : S.c / S.d) * WU;
      const bigLabel = firstBigger ? `${S.a}/${S.b}` : `${S.c}/${S.d}`;
      ctx.strokeStyle = firstBigger ? CARMINE : BLUE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x0, fy - 12);
      ctx.lineTo(x0, fy - 6);
      ctx.moveTo(x0, fy - 12);
      ctx.lineTo(x0 + bigW, fy - 12);
      ctx.lineTo(x0 + bigW, fy - 6);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `the claim ${fn}/${fd} — shorter than the ${bigLabel} you started with`,
        x0 + fn * fpw + 12,
        fy + 16
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
    const dm = STEPS[step].demo;
    if (dm) {
      setA(dm.a);
      setB(dm.b);
      setC(dm.c);
      setD(dm.d);
      setK(dm.k);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setA(t.a);
      setB(t.b);
      setC(t.c);
      setD(t.d);
      setK(2);
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
      setK(dm.k);
    } else if (calib && target) {
      setK(2);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'a') setA(clampInt(raw, 1, b - 1 > 0 ? b - 1 : 1));
    else if (key === 'b') {
      const nb = clampInt(raw, 2, 6);
      setB(nb);
      setA((v) => Math.min(v, Math.max(1, nb - 1)));
    } else if (key === 'c') setC(clampInt(raw, 1, d - 1 > 0 ? d - 1 : 1));
    else if (key === 'd') {
      const nd = clampInt(raw, 2, 6);
      setD(nd);
      setC((v) => Math.min(v, Math.max(1, nd - 1)));
    } else setK(clampInt(raw, 0, 36));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = read
    ? `${a}/${b} ${mode === 'take' ? 'minus' : 'plus'} ${c}/${d} reads ${read.n}/${read.den}.`
    : `${a}/${b} ${mode === 'take' ? 'minus' : 'plus'} ${c}/${d} — the joint refuses: the pieces are different sizes.`;

  return (
    <div className="udlab">
      <header className="head">
        <h1>Unlike Denominators: Find the Cut</h1>
        <p className="lede">
          Halves and thirds refuse to be counted together. Slice every whole with one{' '}
          <em>common cut</em> and the refusal ends: 1/2 + 1/3 = 3/6 + 2/6 = 5/6.
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
            {stamped ? ' Calibrated — the cut serves both runs.' : ''}
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
            {DIALS.filter((dl) => (calib ? dl.key === 'cut' : true)).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'a' ? a : dl.key === 'b' ? b : dl.key === 'c' ? c : dl.key === 'd' ? d : k;
              const max = dl.key === 'a' ? Math.max(1, b - 1) : dl.key === 'c' ? Math.max(1, d - 1) : dl.max;
              const min = dl.key === 'cut' ? (calib ? 2 : 0) : dl.min;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${dl.role}`}
                    onChange={(e) => setDial(dl.key, e.target.value)}
                    style={{ accentColor: dl.color }}
                  />
                  <output className="dv" style={unlocked ? { color: dl.color } : undefined}>
                    {unlocked ? (dl.key === 'cut' && value === 0 ? '—' : value) : '🔒'}
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
                <span className="target-k">The problem</span>
                <span className="target-word">
                  {target.a}/{target.b} + {target.c}/{target.d}
                </span>
                <span className="target-hint mono">
                  {stamped
                    ? `your cut of ${k} serves both — it reads ${joinRead(target.a, target.b, target.c, target.d, k).n}/${k}` +
                      (k === smallestCut(target.b, target.d) ? ' (the smallest possible!)' : ` — the smallest is ${smallestCut(target.b, target.d)}`)
                    : `hunt a cut that both ${target.b} and ${target.d} go into`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {stamped
                    ? 'both runs served'
                    : pct === 50
                      ? 'one run served, one missed'
                      : 'the cut misses both runs'}
                </span>
                {stamped ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">cut = {k}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setA(t.a);
                  setB(t.b);
                  setC(t.c);
                  setD(t.d);
                  setK(2);
                }}
              >
                New problem
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
                  setB(2);
                  setC(1);
                  setD(3);
                  setK(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">1/2 + 1/3 = 3/6 + 2/6 = 5/6</span> &nbsp;·&nbsp; add and subtract
        unlike denominators by re-slicing both to one common size (CCSS 5.NF.A.1); b × d always
        works, the smallest cut is tidier, and the joint refuses to count mixed pieces — the
        estimate check (CCSS 5.NF.A.2) is built into the picture: a &quot;sum&quot; shorter than
        an addend is no sum at all.
      </footer>

      <style jsx>{`
        .udlab {
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
          font-size: 28px;
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
        :global(.udlab) :focus-visible {
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
