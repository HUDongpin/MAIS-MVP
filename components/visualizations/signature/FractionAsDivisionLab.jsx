'use client';

/* ============================================================================
   FractionAsDivisionLab — an interactive "bench" for the fact that A FRACTION
   IS A DIVISION:  a ÷ b  =  a/b,  discovered by SHARING THE REMAINDER.

        7 ÷ 2:  deal three whole loaves to each friend … one loaf waits.
                CUT the waiting loaf in two, one half each:
        7 ÷ 2  =  3 and 1/2  =  7/2.      The bar of a fraction is a ÷ sign.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 5 lab —
   CCSS 5.NF.B.3 is the anchor: interpret a fraction as division of the
   numerator by the denominator (a/b = a ÷ b); solve word problems where the
   answer is a fraction or mixed number (3 loaves shared by 4 people leave
   each person with 3/4); and locate that answer between whole numbers.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "SHARE THE REMAINDER."
     Dealing a loaves to b friends hands out whole loaves while it can, and
     then STOPS — with r loaves waiting on the counter, too few for another
     full round.  Whole-number division ends the story there ("3 remainder
     1") and the leftover has no home.  This lab takes the one step that
     whole-number division cannot: the waiting loaves are each CUT into b
     parts — gold cut lines — and the parts FAN OUT, one to every friend.
     Now every friend holds q wholes and r small parts: the share is
     q + r/b, which is exactly (q·b + r)/b = a/b.  The division sign and the
     fraction bar turn out to be the same mark, and the discovery covers the
     two cases schools fumble: a < b (deal NO wholes, cut everything — 3 ÷ 4
     = 3/4, not "impossible"), and the flip (a/b is a-shared-by-b; 2/7 and
     7/2 are different worlds).
     The capstone flips the direction: given a SHARE, find loaves and
     friends that produce it — and different dealings (7 among 2, 14 among
     4) land the very same share, which is the theorem again, backwards.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DivisionLab owns the QUOTIENT-AND-REMAINDER ARRAY: q clean rows of b
       squares with r squares set apart, the running identity a = b×q + r,
       and the sharing⇄grouping toggle.  This lab draws no array, never
       prints that identity banner, and never leaves the remainder sitting —
       its entire subject is the step DivisionLab deliberately stops short
       of: cutting r and dealing the cuts.
     • LongDivisionLab owns the paper algorithm's tableau.  Nothing here is
       an algorithm; the scene is a bakery counter and share columns.
     • FractionLab owns the partitioned whole (one bar cut into q parts to
       NAME p/q, with a split dial).  Here a cut loaf never keeps its parts:
       they leave immediately to different owners — the gesture is
       distribution, not naming — and no split dial exists.
     • FractionAdditionLab / UnlikeDenominatorsLab / FractionTimesWholeLab
       own the shelf, the rail, and the plates.  None of those devices
       appears: this lab's furniture is a counter and share columns.
     • RationalNumbersLab owns placing p/q on a number line by cutting the
       unit.  This lab locates 7/2 only in WORDS ("between 3 and 4" — the
       wholes the dealing reached, and the next); no number line is drawn.

   One-accent discipline: CARMINE is THE SHARE — each friend's pile and the
   share readout, the object the lab exists to reveal.  GOLD is THE CUT (the
   lab's one move) and the capstone target.  The friends' columns and the
   counter are quiet slate and ink.  GREEN is reserved for "correct" and
   CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • Loaves a and friends b are INTEGERS (1…20, 2…6).  The dealing is
       q = ⌊a/b⌋, r = a mod b, and the conservation b·q + r === a is audited
       for every setting — nothing is ever lost on the counter.
     • The share q + r/b equals a/b EXACTLY: (q·b + r, b) and (a, b) are the
       same pair, and the audit checks it as integers, never as floats.
       Shares are never simplified: 6 ÷ 4 reads 1 and 2/4.
     • a/b and b/a are equal only when a = b — the flip is a real error and
       the audit proves the model knows it.
     • The calibration stamp is the integer cross identity a·u === t·b
       (the share equals the target t/u).  The meter reads 100 only at
       equality (99 is its ceiling everywhere else), audited over every
       target × every reachable (a, b).
   Verified by audit-fractionasdivision.mjs (numeric proof + source greps)
   and verify-fractionasdivision.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/FractionAsDivisionLab.jsx
     2. Import and render it:
          import FractionAsDivisionLab from './FractionAsDivisionLab';
          export default function Page() { return <FractionAsDivisionLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (loaves a, friends b,
              the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic: the deal, the cut, the share; no
              pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two dials: what is shared, and among how many.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // THE SHARE: each friend's pile, the readout
const GOLD = '#b98718'; // THE CUT, and the capstone target
const SLATE = '#5b6b7b';

const DIALS = [
  { key: 'loaves', name: 'Loaves', role: 'how many loaves arrive to be shared', min: 1, max: 20, unlock: 0, color: SLATE },
  { key: 'friends', name: 'Friends', role: 'how many friends share equally', min: 2, max: 6, unlock: 0, color: SLATE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The deal, the cut, the share — exact integers.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* the deal: whole loaves while possible, then it stops */
const deal = (a, b) => ({ q: Math.floor(a / b), r: a % b });
/* each friend's share, after the cut: q wholes and r parts of size 1/b */
const shareParts = (a, b) => {
  const { q, r } = deal(a, b);
  return { wholes: q, num: r, den: b };
};
/* the theorem: the share IS a/b — (q·b + r, b) is the pair (a, b) */
const shareAsFraction = (a, b) => {
  const { q, r } = deal(a, b);
  return { n: q * b + r, den: b };
};
/* order facts, by cross products */
const sameValue = (p1, q1, p2, q2) => p1 * q2 === p2 * q1;
const lessThan = (p1, q1, p2, q2) => p1 * q2 < p2 * q1;
/* where the share lives: between the wholes dealt and the next whole */
const neighbors = (a, b) => {
  const { q, r } = deal(a, b);
  return r === 0 ? { lo: q, hi: q } : { lo: q, hi: q + 1 };
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Make this share."  A target share t/u (a genuine
   mixed number) is posted; choose loaves AND friends so every friend gets
   exactly that.  Different dealings land the same share — 7 among 2 and 14
   among 4 both give 3½ — which is the theorem run backwards.

   No false stamp, provably: CALIBRATED ⟺ a·u === t·b, an integer cross
   identity.  The meter reads 100 only at equality (99 is its ceiling
   everywhere else), audited over every target × every reachable (a, b).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let t, u;
  do {
    u = 2 + Math.floor(Math.random() * 4); // 2 … 5 friends' worth of cutting
    const q0 = 1 + Math.floor(Math.random() * 3); // 1 … 3 wholes each
    const r0 = 1 + Math.floor(Math.random() * (u - 1)); // 1 … u−1 parts each
    t = q0 * u + r0;
  } while (prev && t === prev.t && u === prev.u);
  return { t, u };
}
const closeness = (a, b, t, u) =>
  a * u === t * b ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(a * u - t * b) * 100) / (t * b))));
const isCalibrated = (a, b, t, u) => a * u === t * b;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Deal the wholes — then stop',
    body:
      'Seven loaves, two friends. Deal whole loaves in rounds: one each, two each, three each ' +
      '… and then the dealing STOPS. One loaf waits on the counter.',
    demo: { a: 7, b: 2 },
    q: 'Why does the dealing stop with one loaf still on the counter?',
    choices: [
      'One loaf is too few for another full round — 1 < 2',
      'Seven is odd, and odd numbers cannot be shared',
      'Dealing always stops after three rounds',
    ],
    answer: 0,
    feedback:
      'A round needs one loaf per friend — two loaves — and only one is left, so no more ' +
      'rounds. Whole-number division ends the story here: "3 remainder 1." But look at that ' +
      'loaf. It is bread. It can be CUT — and the next step cuts it.',
  },
  {
    title: 'Cut the leftover',
    body:
      'The waiting loaf is cut into 2 equal parts — one for each friend. The gold cuts fan ' +
      'out, and every friend now holds three wholes and a half.',
    demo: { a: 7, b: 2 },
    lens: { cut: true },
    q: '7 ÷ 2 = ?',
    choices: [
      '3 and 1/2 — three whole loaves and half a loaf each',
      '3 remainder 1 — the last loaf belongs to no one',
      '4 — round it up and move on',
    ],
    answer: 0,
    feedback:
      'Three and a half. In a SHARING question the leftover shares too — "remainder 1" was ' +
      'never an answer, only a pause. Cut the 1 into 2 and each friend gains 1/2: the whole ' +
      'answer is 3 + 1/2. Nothing rounds, nothing is dropped, nothing is left over.',
  },
  {
    title: 'The bar is a division sign',
    body:
      'Read the share again: 3 wholes and 1 half is 7 halves — 7/2. But 7/2 is just "7 ÷ 2" ' +
      'written tall. The fraction bar and the division sign are the same mark.',
    demo: { a: 7, b: 2 },
    lens: { cut: true },
    q: 'Which of these is another name for 7 ÷ 2?',
    choices: ['7/2', '2/7', '7.2'],
    answer: 0,
    feedback:
      '7/2 — the top is what you share, the bottom is how many ways. Watch the order: 2/7 ' +
      'shares TWO loaves among SEVEN friends, a sliver each (2/7 is less than one!), nothing ' +
      'like three and a half. And 7.2 is just seven and two tenths — a different number.',
  },
  {
    title: 'Fewer loaves than friends',
    body:
      'Three loaves, four friends — the dealing gives NO wholes at all. So cut every loaf ' +
      'into 4 and deal the parts: each friend collects three quarters.',
    demo: { a: 3, b: 4 },
    lens: { cut: true },
    q: '3 ÷ 4 = ?',
    choices: [
      '3/4 — every friend gets three quarter-loaves',
      'Impossible — you cannot divide 3 by 4',
      '4/3 — flip it so the bigger number is on top',
    ],
    answer: 0,
    feedback:
      'Three fourths. "You can’t divide a smaller number by a bigger one" is a whole-number ' +
      'habit — with cutting allowed, 3 ÷ 4 works perfectly and lands below one whole. ' +
      'Flipping to 4/3 answers a different question (4 loaves among 3 friends).',
  },
  {
    title: 'Where the share lives',
    body:
      'Seven halves is more than three wholes and less than four: the share 7/2 lives between ' +
      'the whole numbers 3 and 4 — the rounds you dealt, and the round you could not.',
    demo: { a: 7, b: 2 },
    lens: { cut: true, between: true },
    q: 'Between which whole numbers does 7/2 sit?',
    choices: ['Between 3 and 4', 'Between 7 and 8', 'Between 1 and 2'],
    answer: 0,
    feedback:
      'Between 3 and 4: the dealing reached three full rounds (that is the 3) and fell short ' +
      'of a fourth (that is the 4). A fraction a/b is a NUMBER — the dealing tells you ' +
      'exactly which two whole numbers it lives between.',
  },
  {
    title: 'Five bars, four kids',
    body:
      'Five chocolate bars, shared exactly by four kids. Deal one bar each; cut the last ' +
      'into four; read a kid’s share.',
    demo: { a: 5, b: 4 },
    lens: { cut: true },
    q: 'How much chocolate does each kid get?',
    choices: [
      '1 and 1/4 bars — a whole bar and a quarter',
      '1 bar, and the fifth bar goes back to the shop',
      '4/5 of a bar',
    ],
    answer: 0,
    feedback:
      'One and a quarter: 5 ÷ 4 = 5/4 = 1 + 1/4. Sending the fifth bar back is the ' +
      '"remainder" habit again — a sharing answer must share everything. And 4/5 is the flip: ' +
      'four bars among five kids, which is LESS than a whole bar each.',
  },
  {
    title: 'Make this share',
    body:
      'A share is posted. Choose the loaves AND the friends so that every friend gets exactly ' +
      'that share. More than one dealing works — different counters, same share.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function FractionAsDivisionLab() {
  const [a, setA] = useState(7);
  const [b, setB] = useState(2);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const lens = current.lens || {};
  const cut = calib || !!lens.cut;

  const pct = calib && target != null ? closeness(a, b, target.t, target.u) : 0;
  const calibrated = calib && target != null ? isCalibrated(a, b, target.t, target.u) : false;

  sceneRef.current = {
    a,
    b,
    cut,
    between: !calib && !!lens.between,
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

    const { q, r } = deal(S.a, S.b);
    const frac = shareAsFraction(S.a, S.b);

    /* ---- the SAY band: a ÷ b = a/b = q and r/b ----------------------------- */
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
      const segs = [
        { kind: 'text', s: `${S.a} ÷ ${S.b} =`, color: INK },
        { kind: 'frac', num: frac.n, den: frac.den, color: CARMINE },
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
    ctx.fillStyle = S.cut ? GOLD : INK_SOFT;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(
      S.cut
        ? r === 0
          ? `each friend gets ${q} whole${q === 1 ? '' : 's'} exactly`
          : `each friend gets ${q > 0 ? `${q} whole${q === 1 ? '' : 's'} and ` : ''}${r}/${S.b}`
        : `the dealing gave each friend ${q} — ${r} wait${r === 1 ? 's' : ''} on the counter`,
      W / 2,
      sayY + fs * 1.8
    );
    if (S.between) {
      const nb = neighbors(S.a, S.b);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.fillText(
        nb.lo === nb.hi ? `${frac.n}/${frac.den} is exactly the whole number ${nb.lo}` : `${frac.n}/${frac.den} lives between ${nb.lo} and ${nb.hi}`,
        W / 2,
        sayY + fs * 1.8 + 20
      );
    }

    /* ---- THE COUNTER: the loaves that wait --------------------------------- */
    const loafW = 44;
    const loafH = 26;
    const counterY = 130;
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`the counter — ${S.a} loaves arrived, ${q * S.b} dealt out in wholes`, 18, counterY - 26);
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, counterY + loafH + 8.5);
    ctx.lineTo(W - 14, counterY + loafH + 8.5);
    ctx.stroke();
    if (r === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('empty — the dealing came out even', 18, counterY + loafH / 2);
      ctx.textAlign = 'center';
    }
    for (let i = 0; i < r; i++) {
      const lx = 18 + i * (loafW + 14);
      ctx.fillStyle = '#e9dfc8';
      rr(lx, counterY, loafW, loafH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,43,58,0.5)';
      ctx.lineWidth = 1.3;
      rr(lx, counterY, loafW, loafH, 8);
      ctx.stroke();
      if (S.cut) {
        /* the gold cuts: this loaf splits into b parts */
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.8;
        for (let j = 1; j < S.b; j++) {
          const cxx = lx + (j * loafW) / S.b;
          ctx.beginPath();
          ctx.moveTo(cxx, counterY + 2);
          ctx.lineTo(cxx, counterY + loafH - 2);
          ctx.stroke();
        }
        /* the fan: parts leave to the shares */
        ctx.strokeStyle = 'rgba(185,135,24,0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lx + loafW / 2, counterY + loafH + 2);
        ctx.lineTo(lx + loafW / 2, counterY + loafH + 8);
        ctx.stroke();
      }
    }
    if (r > 0 && S.cut) {
      ctx.fillStyle = GOLD;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`each waiting loaf cut into ${S.b} — the parts fan out below`, 18 + r * (loafW + 14) + 8, counterY + loafH / 2);
      ctx.textAlign = 'center';
    }
    if (r > 0 && !S.cut) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`waiting… too few for another round (${r} < ${S.b})`, 18 + r * (loafW + 14) + 8, counterY + loafH / 2);
      ctx.textAlign = 'center';
    }

    /* ---- THE SHARES: one column per friend ---------------------------------- */
    const topY = counterY + loafH + 40;
    const colGap = 14;
    const colW = Math.min(110, (W - 40 - (S.b - 1) * colGap) / S.b);
    const totalW = S.b * colW + (S.b - 1) * colGap;
    const cx0 = (W - totalW) / 2;
    const miniW = Math.min(40, colW - 22);
    const miniH = 15;
    const colH = H - topY - 30;
    for (let f = 0; f < S.b; f++) {
      const colX = cx0 + f * (colW + colGap);
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1.3;
      rr(colX, topY, colW, colH, 9);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(`friend ${f + 1}`, colX + colW / 2, topY + 13);
      /* q whole loaves */
      const stackX = colX + (colW - miniW) / 2;
      let yy = topY + 26;
      for (let i = 0; i < q; i++) {
        ctx.fillStyle = CARMINE;
        rr(stackX, yy, miniW, miniH, 5);
        ctx.fill();
        yy += miniH + 5;
      }
      /* r parts of size 1/b, once the cut happens */
      if (S.cut && r > 0) {
        const partW = Math.max(6, miniW / S.b);
        for (let i = 0; i < r; i++) {
          ctx.fillStyle = 'rgba(200,30,79,0.45)';
          rr(stackX, yy, partW, miniH, 3);
          ctx.fill();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1.2;
          rr(stackX, yy, partW, miniH, 3);
          ctx.stroke();
          yy += miniH + 5;
        }
      }
      /* the share readout under each column */
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12px ui-monospace, Menlo, monospace';
      const shareTxt = S.cut
        ? r === 0
          ? `${q}`
          : q > 0
            ? `${q} + ${r}/${S.b}`
            : `${r}/${S.b}`
        : `${q}`;
      ctx.fillText(shareTxt, colX + colW / 2, topY + colH - 14);
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
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setA(1);
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
      setA(dm.a);
      setB(dm.b);
    } else if (calib) {
      setA(1);
      setB(2);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'loaves') setA(clampInt(raw, 1, 20));
    else setB(clampInt(raw, 2, 6));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const dq = deal(a, b);
  const spoken =
    `${a} loaves among ${b} friends: each gets ${dq.q}${cut && dq.r > 0 ? ` and ${dq.r}/${b}` : ''}` +
    `${!cut && dq.r > 0 ? `, with ${dq.r} waiting uncut` : ''}.` +
    (calib && target ? ` The posted share is ${target.t}/${target.u}.` : '');

  return (
    <div className="fdivlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>A Fraction Is a Division</h1>
        <p className="lede">
          Deal the wholes, then <em>cut the leftover</em>: 7 ÷ 2 = 3½ = 7/2. The fraction bar and
          the division sign turn out to be the same mark.
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
            {calibrated ? ' Calibrated — every friend gets exactly the posted share.' : ''}
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
              const value = dl.key === 'loaves' ? a : b;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? dl.role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={dl.max}
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
                <span className="target-k">Every friend must get</span>
                <span className="target-word">
                  {target.t}/{target.u}
                </span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${a} loaves among ${b} friends gives exactly ${target.t}/${target.u} each`
                    : `that is ${Math.floor(target.t / target.u)} whole${Math.floor(target.t / target.u) === 1 ? '' : 's'} and ${target.t % target.u}/${target.u} each`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'shares match exactly' : `${a} ÷ ${b} = ${a}/${b} so far`}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim for {target.t}/{target.u} each</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setA(1);
                  setB(2);
                }}
              >
                New share
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
                  setA(7);
                  setB(2);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">7 ÷ 2 = 7/2 = 3 and 1/2 · 3 ÷ 4 = 3/4</span> &nbsp;·&nbsp; a
        fraction is a division of the numerator by the denominator (CCSS 5.NF.B.3): deal the
        wholes, cut the leftover, and every friend&apos;s share is a/b — a number that lives
        between two whole numbers the dealing already found.
      </footer>

      <style jsx>{`
        .fdivlab {
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
        :global(.fdivlab) :focus-visible {
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
