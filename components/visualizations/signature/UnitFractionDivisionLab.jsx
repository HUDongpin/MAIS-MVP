'use client';

/* ============================================================================
   UnitFractionDivisionLab — an interactive "bench" for DIVIDING WITH UNIT
   FRACTIONS: the two questions division can ask, drawn as two scenes.

        3 ÷ 1/4  =  "how many quarter-sticks fit along a 3-whole ribbon?"
                 =  12         ← division that makes BIGGER
        1/3 ÷ 2  =  "cut a third fairly between two"
                 =  1/6        ← a piece of a piece
        …and every answer is checked by the multiplication it came from:
        12 × 1/4 = 3.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 5 lab —
   CCSS 5.NF.B.7 is the anchor, all three clauses:
     • 5.NF.B.7.a  divide a unit fraction by a whole number (1/3 ÷ 2 = 1/6,
                   because a third split in two is a sixth of the whole)
     • 5.NF.B.7.b  divide a whole number by a unit fraction (4 ÷ 1/5 = 20,
                   because each whole holds five fifths)
     • 5.NF.B.7.c  word problems — the raisin-servings step, and the
                   capstone's ribbon-measuring challenge.
   The standard's own justification move — "explain by creating the
   multiplication fact" — is a whole step, not a footnote.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE STICK COUNT, AND DIVISION THAT GROWS."
     A carmine RIBBON n wholes long lies on the bench, and a short STICK of
     length 1/b measures it out: tick, tick, tick — the sticks fit exactly,
     none left over, and the COUNT of sticks is the quotient.  Dividing 3 by
     1/4 lands on 12, a number four times BIGGER than what you started with:
     "dividing always makes smaller" — the twin of the multiplication myth
     that ScalingLab kills — dies here, measured, because a small stick fits
     MANY times.  The other question shares instead of measuring: ONE piece
     1/b, split fairly among n, leaves each with 1/(b·n) OF THE WHOLE — a
     piece of a piece, and the whole never stops being the referent.
     Every quotient is welded to its multiplication fact on screen
     (12 × 1/4 = 3): division here is never a new operation, only a question
     asked about an old one.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DivisionLab owns whole-number quotients with REMAINDERS on an array.
       Nothing here has a remainder — sticks of size 1/b always come out
       even on whole ribbons — and no array of squares appears.
     • FractionAsDivisionLab (5.NF.B.3) owns SHARING WHOLES: dealing loaves
       to friends and cutting the leftover.  This lab never deals wholes:
       its part-(a) scene shares one PIECE, and its part-(b) scene does not
       share at all — it MEASURES, the question DivisionLab and 5.NF.B.3
       never ask.
     • MeasurementLab (Grade 2) owns measuring OBJECTS with unit rods and
       cubes, estimation, and the count-times-size invariant for lengths.
       No rods, cubes, or rulers appear here: the stick is a FRACTION OF THE
       WHOLE (1/b), the scene is a division equation, and the payoff is
       n ÷ (1/b) = n·b with its multiplication check — arithmetic, not
       measurement technique.
     • FractionMultiplicationLab owns the overlap square; ScalingLab owns
       the factor gauge; FractionAdditionLab and UnlikeDenominatorsLab own
       the shelf and the rail.  None of that furniture is here.
     • MultiplesLab owns skip-counting a number line.  The sticks are not
       skip-counts of a number: they tile a LENGTH, the ribbon carries no
       axis numbers, and nothing runs to forever.

   One-accent discipline: CARMINE is the division's object — the ribbon, the
   shared piece, the quotient readout.  GOLD marks the whole-marks, the
   cutting, and the capstone target.  The stick count alternates carmine
   tones only so adjacent sticks stay countable.  GREEN is reserved for
   "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • The ribbon length n and stick size b are INTEGERS (1…6, 2…6).  The
       stick count is the integer n·b, and the audit proves the fit is exact
       for every setting: no partial stick ever appears.
     • The multiplication check is the integer identity (n·b) × 1 = n·b
       parts of size 1/b re-assembling to exactly n wholes: (n·b)/b === n,
       audited as integers.
     • The shared piece is the exact pair (1, b·n), and 1/(b·n) < 1/b is
       proved by cross products for every b, n.
     • Division by a unit fraction GROWS: n·b > n whenever b ≥ 2 — audited,
       because it is the lab's headline claim.
     • The calibration stamp is the integer identity n·b === target.  The
       meter reads 100 only at equality (99 is its ceiling everywhere else),
       audited over every target × every reachable (n, b).
   Verified by audit-unitfractiondivision.mjs (numeric proof + source greps)
   and verify-unitfractiondivision.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/UnitFractionDivisionLab.jsx
     2. Import and render it:
          import UnitFractionDivisionLab from './UnitFractionDivisionLab';
          export default function Page() { return <UnitFractionDivisionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (ribbon n, stick b,
              the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic: fits, shares, checks; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The ribbon's length and the stick's size.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the division's object: ribbon, piece, quotient
const GOLD = '#b98718'; // whole-marks, the cut, the capstone target
const SLATE = '#5b6b7b';

const DIALS = [
  { key: 'ribbon', name: 'The ribbon', role: 'how many wholes long', min: 1, max: 6, unlock: 0, color: CARMINE },
  { key: 'stick', name: 'The stick', role: 'the measuring piece is 1/this', min: 2, max: 6, unlock: 0, color: GOLD },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Fits, shares, and the multiplication check — exact.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* HOW MANY FIT: n ÷ (1/b) — each whole holds exactly b sticks */
const fitCount = (n, b) => n * b;
/* the fit is exact: the sticks re-assemble to the ribbon, none left over */
const fitIsExact = (n, b) => (n * b) % b === 0 && (n * b) / b === n;
/* THE CHECK: the multiplication fact the quotient came from */
const checkFact = (n, b) => ({ count: fitCount(n, b), unitDen: b, gives: n });
/* SHARE A PIECE: (1/b) ÷ n — each of n gets 1/(b·n) of the whole */
const sharePiece = (b, n) => ({ n: 1, den: b * n });
/* order facts, by cross products */
const lessThan = (p1, q1, p2, q2) => p1 * q2 < p2 * q1;
/* division by a unit fraction GROWS (b ≥ 2), the headline claim */
const grows = (n, b) => fitCount(n, b) > n;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Fit exactly this many sticks."  A target count is
   posted; choose the ribbon AND the stick so the count lands exactly.  Many
   recipes work (12 sticks: 3 wholes of quarters, 4 of thirds, 2 of sixths,
   6 of halves) — the times table, met walking backwards through a division.

   No false stamp, provably: CALIBRATED ⟺ n·b === target, an integer
   identity.  The meter reads 100 only at equality (99 is its ceiling
   everywhere else), audited over every target × every reachable (n, b).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let t;
  do {
    const n0 = 2 + Math.floor(Math.random() * 4); // 2 … 5 wholes
    const b0 = 2 + Math.floor(Math.random() * 5); // sticks of 1/2 … 1/6
    t = n0 * b0;
  } while (prev && t === prev);
  return t;
}
const closeness = (c, t) =>
  c === t ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(t - c) * 100) / 30)));
const isCalibrated = (c, t) => c === t;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'What a denominator promises',
    body:
      'One whole ribbon, and a stick a quarter long. Lay the stick along the ribbon: it fits ' +
      'four times, exactly — that is what "fourth" has meant all along.',
    demo: { n: 1, b: 4, mode: 'fit' },
    q: 'How many 1/4-sticks fit along one whole?',
    choices: ['4 — four fourths make a whole, by definition', '1/4 of a stick', 'It depends on the ribbon'],
    answer: 0,
    feedback:
      'Four. The bottom of a unit fraction is a PROMISE about fitting: 1/4 is the piece that ' +
      'fits a whole exactly four times. Every division in this lab cashes in that promise — ' +
      'so the first question, "how many fit in ONE?", is always answered by the bottom itself.',
  },
  {
    title: 'A longer ribbon',
    body:
      'Stretch the ribbon to 3 wholes and measure again. Each whole swallows 4 sticks, and ' +
      'there are three wholes of them — count the ticks.',
    demo: { n: 3, b: 4, mode: 'fit' },
    q: '3 ÷ 1/4 = ?',
    choices: ['12 — four sticks per whole, three wholes', '3/4', 'Somewhere below 3'],
    answer: 0,
    feedback:
      'Twelve: n ÷ (1/b) asks "how many 1/b-sticks fit in n wholes?", and each whole holds ' +
      'exactly b of them, so the count is n × b = 12. Notice the shape of the rule: dividing ' +
      'BY a fraction turned into multiplying — because fitting small things means many fits.',
  },
  {
    title: 'Division that grows',
    body:
      'Look at the two numbers: you divided 3 — and got 12. The answer is BIGGER than what ' +
      'you started with.',
    demo: { n: 3, b: 4, mode: 'fit' },
    q: 'True or false: dividing always makes things smaller.',
    choices: [
      'False — 3 ÷ 1/4 = 12, four times bigger',
      'True — division splits, and splitting shrinks',
      'True, except when you divide by zero',
    ],
    answer: 0,
    feedback:
      'False — the twin of "multiplying always grows", and it dies the same way. Dividing by ' +
      'a number SMALLER than 1 grows the answer, because you are asking how many SMALL sticks ' +
      'fit, and small sticks fit many times. Division by numbers bigger than 1 shrinks, as ' +
      'always. The divisor’s size decides, not the word "divide".',
  },
  {
    title: 'Check it by multiplying',
    body:
      'A quotient must survive the return trip: lay the 12 quarter-sticks back end to end and ' +
      'they rebuild exactly the 3 wholes. The check line under the equation says so.',
    demo: { n: 3, b: 4, mode: 'fit' },
    lens: { check: true },
    q: 'Which multiplication fact CHECKS that 3 ÷ 1/4 = 12?',
    choices: ['12 × 1/4 = 3 — the sticks rebuild the ribbon', '12 × 4 = 48', '1/4 × 1/3 = 1/12'],
    answer: 0,
    feedback:
      'Twelve quarter-sticks are twelve quarters: 12 × 1/4 = 12/4 = 3 wholes — the ribbon, ' +
      'rebuilt. Every division answer earns its keep this way (CCSS says so verbatim): if the ' +
      'multiplication does not give back what you divided, the quotient was wrong.',
  },
  {
    title: 'The other question: share a piece',
    body:
      'Now no measuring — sharing. ONE third of a dish of cornbread is left, and 2 people ' +
      'split it fairly. The third is cut in two; watch what each piece is OF THE WHOLE dish.',
    demo: { n: 2, b: 3, mode: 'share' },
    q: '1/3 ÷ 2 = ?',
    choices: ['1/6 — half of a third is a sixth of the whole', '2/3', '3/2'],
    answer: 0,
    feedback:
      'One sixth. Cutting 1/3 into 2 makes pieces so small that SIX fill the whole dish — the ' +
      'cut multiplied the bottom: 1/(3×2). The classic slip, 2/3, multiplies instead of ' +
      'sharing; 3/2 flips the question. And the check works here too: 1/6 × 2 = 2/6 = 1/3.',
  },
  {
    title: 'The raisin problem',
    body:
      'Two cups of raisins, and a serving is 1/3 of a cup. The ribbon is the raisins; the ' +
      'stick is one serving. Count the servings.',
    demo: { n: 2, b: 3, mode: 'fit' },
    q: 'How many 1/3-cup servings are in 2 cups of raisins?',
    choices: ['6 servings — three per cup, two cups', '2/3 of a serving', 'You cannot divide 2 by a fraction'],
    answer: 0,
    feedback:
      'Six: 2 ÷ 1/3 = 2 × 3 = 6, and the check 6 × 1/3 = 2 says the servings use up the ' +
      'raisins exactly. "How many servings" questions are divisions by a unit fraction — the ' +
      'most common place a fifth grader meets one in the wild.',
  },
  {
    title: 'Fit exactly this many',
    body:
      'A stick count is posted. Choose the ribbon AND the stick so the sticks fit EXACTLY ' +
      'that many times. More than one recipe works — the times table, walked backwards.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function UnitFractionDivisionLab() {
  const [n, setN] = useState(1);
  const [b, setB] = useState(4);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const mode = calib ? 'fit' : current.demo ? current.demo.mode : 'fit';
  const showCheck = !calib && !!(current.lens && current.lens.check);

  const count = fitCount(n, b);
  const pct = calib && target != null ? closeness(count, target) : 0;
  const calibrated = calib && target != null ? isCalibrated(count, target) : false;

  sceneRef.current = { n, b, mode, showCheck, calib, calibrated, target: calib ? target : null };

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

    const fits = fitCount(S.n, S.b);
    const shared = sharePiece(S.b, S.n);

    /* ---- the SAY band ------------------------------------------------------ */
    const sayY = 34;
    const fs = Math.min(22, W / 26);
    const fracW = (num, den) => {
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      return Math.max(ctx.measureText(String(num)).width, ctx.measureText(String(den)).width) + 8;
    };
    const drawFrac = (cx, num, den, color) => {
      const w = fracW(num, den);
      ctx.fillStyle = color;
      ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`;
      ctx.fillText(String(num), cx, sayY - fs * 0.62);
      ctx.fillText(String(den), cx, sayY + fs * 0.66);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, sayY);
      ctx.lineTo(cx + w / 2, sayY);
      ctx.stroke();
      return w;
    };
    {
      const gap = 13;
      const segs =
        S.mode === 'fit'
          ? [
              { kind: 'text', s: `${S.n} ÷`, color: INK },
              { kind: 'frac', num: 1, den: S.b, color: GOLD },
              { kind: 'text', s: `= ${fits}`, color: CARMINE },
            ]
          : [
              { kind: 'frac', num: 1, den: S.b, color: CARMINE },
              { kind: 'text', s: `÷ ${S.n} =`, color: INK },
              { kind: 'frac', num: shared.n, den: shared.den, color: CARMINE },
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
          ctx.fillText(sg.s, x + sg.w / 2, sayY);
        }
        x += sg.w + gap;
      }
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    ctx.fillText(
      S.mode === 'fit'
        ? `how many 1/${S.b}-sticks fit along ${S.n} whole${S.n === 1 ? '' : 's'}? — ${fits}`
        : `one ${S.b === 2 ? 'half' : `1/${S.b} piece`}, split fairly among ${S.n} — each gets 1/${shared.den} of the whole`,
      W / 2,
      sayY + fs * 1.8
    );
    if (S.showCheck && S.mode === 'fit') {
      const cf = checkFact(S.n, S.b);
      ctx.fillStyle = GOLD;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(`check: ${cf.count} × 1/${cf.unitDen} = ${cf.count}/${cf.unitDen} = ${cf.gives} ✓`, W / 2, sayY + fs * 1.8 + 20);
    }

    /* ---- the scenes --------------------------------------------------------- */
    const padX = 40;
    if (S.mode === 'fit') {
      /* THE RIBBON: n wholes, whole-marks in gold */
      const WU = (W - padX * 2) / 6.1; // px per whole (the dial reaches 6)
      const x0 = padX;
      const ry = H * 0.44;
      const rh = 46;
      ctx.fillStyle = 'rgba(200,30,79,0.18)';
      rr(x0, ry, S.n * WU, rh, 5);
      ctx.fill();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 1.6;
      rr(x0, ry, S.n * WU, rh, 5);
      ctx.stroke();
      for (let wl = 1; wl <= S.n; wl++) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x0 + wl * WU, ry - 12);
        ctx.lineTo(x0 + wl * WU, ry + rh + 12);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = INK;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`the ribbon — ${S.n} whole${S.n === 1 ? '' : 's'}`, x0, ry - 22);
      ctx.textAlign = 'center';

      /* THE STICKS: they tick along beneath, alternating tones */
      const sw = WU / S.b;
      const sy = ry + rh + 26;
      for (let i = 0; i < fits; i++) {
        ctx.fillStyle = i % 2 === 0 ? CARMINE : 'rgba(200,30,79,0.55)';
        rr(x0 + i * sw + 0.8, sy, sw - 1.6, 20, 3);
        ctx.fill();
      }
      /* one loose stick, as the measuring tool */
      ctx.fillStyle = GOLD;
      rr(x0, sy + 40, sw, 16, 3);
      ctx.fill();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`the stick — 1/${S.b} of a whole`, x0 + sw + 10, sy + 48);
      ctx.textAlign = 'center';
      /* the count badge */
      ctx.fillStyle = CARMINE;
      ctx.font = `700 ${Math.min(17, W / 40)}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${fits} sticks — exact, none left over`, x0 + S.n * WU + 14, sy + 10);
      ctx.textAlign = 'center';

      /* the capstone target chip */
      if (S.calib && S.target != null) {
        ctx.fillStyle = GOLD;
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText(`target: fit exactly ${S.target} sticks`, W / 2, ry - 46);
      }
    } else {
      /* SHARE A PIECE: one whole dish; the 1/b piece; the fair cut */
      const PW = Math.min(W * 0.62, 430);
      const x0 = (W - PW) / 2;
      const py = H * 0.42;
      const ph = 78;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      rr(x0, py, PW, ph, 6);
      ctx.stroke();
      /* the b partitions of the whole (quiet) */
      for (let j = 1; j < S.b; j++) {
        ctx.strokeStyle = 'rgba(28,43,58,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + (j * PW) / S.b, py);
        ctx.lineTo(x0 + (j * PW) / S.b, py + ph);
        ctx.stroke();
      }
      /* the piece 1/b, shaded */
      ctx.fillStyle = 'rgba(200,30,79,0.28)';
      ctx.fillRect(x0 + 1, py + 1, PW / S.b - 2, ph - 2);
      /* the fair cut of that piece into n, in gold */
      for (let j = 1; j < S.n; j++) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + (j * PW) / S.b / S.n, py + 2);
        ctx.lineTo(x0 + (j * PW) / S.b / S.n, py + ph - 2);
        ctx.stroke();
      }
      /* one person's part, deep carmine */
      ctx.fillStyle = 'rgba(200,30,79,0.6)';
      ctx.fillRect(x0 + 1, py + 1, PW / S.b / S.n - 2, ph - 2);
      ctx.fillStyle = INK;
      ctx.font = '600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('the whole dish', x0, py - 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`one share = 1/${shared.den} of the whole`, W / 2, py + ph + 24);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.fillText(`${shared.den} such pieces would fill the dish`, W / 2, py + ph + 44);
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
      setN(dm.n);
      setB(dm.b);
    }
    if (STEPS[step].calib) {
      setTarget(makeTarget(null));
      setN(1);
      setB(2);
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
      setN(dm.n);
      setB(dm.b);
    } else if (calib) {
      setN(1);
      setB(2);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'ribbon') setN(clampInt(raw, 1, 6));
    else setB(clampInt(raw, 2, 6));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    (mode === 'fit'
      ? `${n} divided by 1/${b} — ${count} sticks fit exactly.`
      : `1/${b} shared among ${n}: each gets 1/${b * n} of the whole.`) +
    (calib && target ? ` The target is ${target} sticks.` : '');

  return (
    <div className="ufdlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Dividing with Unit Fractions</h1>
        <p className="lede">
          Two questions, one operation: <em>how many quarter-sticks fit in 3?</em> (12 — division
          that grows) and <em>how do 2 people share a third?</em> (1/6 each) — with every answer
          checked by the multiplication it came from.
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
            {calibrated ? ' Calibrated — the sticks fit the target exactly.' : ''}
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
            {DIALS.map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'ribbon' ? n : b;
              const roleTxt =
                mode === 'share'
                  ? dl.key === 'ribbon'
                    ? 'how many people share the piece'
                    : 'the piece being shared is 1/this'
                  : dl.role;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? roleTxt : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={dl.max}
                    step={1}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${roleTxt}`}
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
                <span className="target-k">Fit exactly</span>
                <span className="target-word">{target} sticks</span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${n} ÷ 1/${b} = ${count} — exactly the target`
                    : `ribbon wholes × sticks-per-whole must make ${target}`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'fits exactly' : count > target ? 'too many sticks' : 'measuring…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {n} × {b} = {count} of {target}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setN(1);
                  setB(2);
                }}
              >
                New count
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
                  setB(4);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">3 ÷ 1/4 = 12 · 1/3 ÷ 2 = 1/6 · check: 12 × 1/4 = 3</span>{' '}
        &nbsp;·&nbsp; divide unit fractions by whole numbers and whole numbers by unit fractions
        (CCSS 5.NF.B.7): measuring asks &quot;how many fit&quot; and grows; sharing cuts a piece
        of a piece and shrinks — and every quotient is checked by its multiplication fact.
      </footer>

      <style jsx>{`
        .ufdlab {
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
        :global(.ufdlab) :focus-visible {
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
