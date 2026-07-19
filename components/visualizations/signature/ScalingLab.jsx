'use client';

/* ============================================================================
   ScalingLab — an interactive "bench" for MULTIPLICATION AS SCALING
   (resizing): the product k × L compares to L by where the factor k sits
   relative to ONE — and you can call it before you compute anything.

        k > 1  →  the copy STRETCHES        k = 1  →  the copy is UNCHANGED
        k < 1  →  the copy SHRINKS          … and 3/3, 5/5, n/n are 1 in disguise.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 5 lab —
   CCSS 5.NF.B.5 is the anchor, both clauses:
     • 5.NF.B.5.a  compare the size of a product to the size of one factor on
                   the basis of the size of the other factor, WITHOUT
                   performing the indicated multiplication  (the no-peek step)
     • 5.NF.B.5.b  multiplying by a fraction greater than 1 stretches, by a
                   fraction less than 1 shrinks, and by n/n changes nothing —
                   which is why renaming a fraction never changes an amount.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE FACTOR'S SEAT DECIDES."
     A carmine ORIGINAL bar lies on the bench.  Below it lies its SCALED COPY,
     k times as long — and between them sits THE FACTOR GAUGE: a short track
     with one gold pivot at 1 and a needle at k.  The lab's whole claim is
     that the needle's SEAT relative to the pivot — left of 1, on 1, right of
     1 — already contains the answer: the call (STRETCHED / UNCHANGED /
     SHRUNK) is computed from p vs q alone, never from the product, and a
     thin ink shadow on the copy's row marks where the original ended, so the
     stretch or shrink is visible against it.  The no-peek step hides the
     product's value entirely and the call still reads — that IS 5.NF.B.5.a.
     The star misconception, "MULTIPLYING ALWAYS MAKES BIGGER", is the second
     question of the lesson, and ×1/2 answers it by shrinking the bar in
     front of the student.  The quiet second payoff: set the factor to 3/3
     and the copy refuses to move — n/n is the number 1 wearing a costume,
     which is exactly why equivalent renames never change an amount.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • MultiplesLab owns the skip-count number line (equal jumps, landings).
       No number line appears here: the factor gauge carries exactly two
       marks — zero and the gold ONE — plus a needle; nothing is counted
       along it and nothing jumps.
     • RatioLab owns the double number line and the batch tape (two
       co-varying quantities).  This lab resizes ONE quantity; there is no
       second ruler and no tape of repeating parts.
     • FractionTimesWholeLab owns n × (a/b) as repeated plates; Fraction-
       MultiplicationLab owns (a/b) × (c/d) as the overlap of shadings.  This
       lab never stacks copies and never shades a square: its object is the
       COMPARISON product-vs-factor, not the computation — the arithmetic is
       shown only as a label, and one step hides even that.
     • MeasurementLab owns measuring with unit rods; no units are iterated
       here — the bars are lengths, not counts.
     • ExponentialFunctionLab owns REPEATED growth (the ×b staircase).  The
       factor here is applied exactly once; nothing compounds.
     • InequalityLab owns two linked number lines and the flipping sign.
       The comparisons here are bar-versus-bar, with no axis at all.

   One-accent discipline: CARMINE is the object being resized — the original
   bar, its scaled copy, and the gauge needle.  GOLD is the PIVOT — the
   number 1, the still point the whole lesson turns on — and the capstone
   target.  Everything else is quiet ink and slate.  GREEN is reserved for
   "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a ten-year-old):
     • The factor is an exact fraction p/q of INTEGERS (1…6 each); the bar's
       length L is an integer (3…8).  The scaled length is the exact pair
       (L·p, q) — never a float, never simplified.
     • THE THEOREM OF THE LAB, audited exhaustively: the seat of p/q against
       1 (p vs q) agrees with the product's comparison against L
       (L·p vs L·q) for every L, p, q.  Predicting without multiplying is
       therefore mathematically safe, not a classroom shortcut.
     • n/n is 1 exactly: whenever p === q the scaled pair (L·p, q) equals L
       by cross products, and the copy draws at exactly the original's px.
     • The calibration stamp is the integer cross identity L·p === T·q.  Any
       equivalent name of the right factor lands it (2/4 works where 1/2
       does) — the meter reads 100 only at exact equality, audited over
       every target × every reachable (p, q).
   Verified by audit-scaling.mjs (numeric proof + source greps) and
   verify-scaling.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ScalingLab.jsx
     2. Import and render it:
          import ScalingLab from './ScalingLab';
          export default function Page() { return <ScalingLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the length L, the
              factor p/q, the lesson step, answers, the challenge target).
     MODEL  — pure integer arithmetic: seats, cross products, exact pairs.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The bar's length, and the factor's top and bottom.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the object being resized: bars and needle
const GOLD = '#b98718'; // the pivot ONE, and the capstone target
const SLATE = '#5b6b7b';

const DIALS = [
  { key: 'len', name: 'The bar', role: 'the original length being scaled', min: 3, max: 8, unlock: 0, color: SLATE },
  { key: 'top', name: 'Factor top', role: 'the p of the factor p/q', min: 1, max: 6, unlock: 1, color: CARMINE },
  { key: 'bottom', name: 'Factor bottom', role: 'the q of the factor p/q', min: 1, max: 6, unlock: 2, color: CARMINE },
];

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Seats and cross products; the arithmetic stays exact.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

/* THE SEAT: where p/q sits relative to 1, decided by p vs q alone */
const seat = (p, q) => (p > q ? 1 : p === q ? 0 : -1);
const CALL = { '1': 'STRETCHED', '0': 'UNCHANGED', '-1': 'SHRUNK' };
const callFor = (p, q) => CALL[String(seat(p, q))];

/* the scaled length, as an exact pair — never a float, and the pair keeps
   the name the arithmetic gave it */
const scaledPair = (L, p, q) => ({ n: L * p, den: q });
/* the product-vs-original comparison, by cross products */
const productSeat = (L, p, q) => (L * p > L * q ? 1 : L * p === L * q ? 0 : -1);
const toMixed = (n, den) => ({ w: Math.floor(n / den), r: n % den });

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Hit the gold mark."  The bar is pinned; choose a
   factor p/q that lands the copy EXACTLY on the target length T.  Every
   equivalent name of the right factor works — 2/4 lands wherever 1/2 lands —
   which is the n/n lesson paying off.

   No false stamp, provably: CALIBRATED ⟺ L·p === T·q, an integer cross
   identity.  The meter reads 100 only at equality (99 is its ceiling
   everywhere else), audited over every target × every (p, q).
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let L, T;
  do {
    L = 3 + Math.floor(Math.random() * 6); // 3 … 8
    const q0 = 2 + Math.floor(Math.random() * 3); // 2 … 4
    const p0 = 1 + Math.floor(Math.random() * 6); // 1 … 6
    if (p0 === q0 || (L * p0) % q0 !== 0) {
      T = null;
      continue;
    }
    T = (L * p0) / q0;
  } while (!T || T === L || T < 1 || T > 24 || (prev && T === prev.T && L === prev.L));
  return { L, T };
}
const closeness = (L, p, q, T) =>
  L * p === T * q ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(L * p - T * q) * 100) / (T * q))));
const isCalibrated = (L, p, q, T) => L * p === T * q;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The do-nothing factor',
    body:
      'A bar of 6 lies on the bench, and below it, its copy — multiplied by 1. The gauge ' +
      'needle sits exactly on the gold pivot. Slide the bar dial; the copy tracks it.',
    demo: { L: 6, p: 1, q: 1 },
    q: 'Multiply the bar by 1. The copy comes out…',
    choices: [
      'Exactly as long — ×1 resizes nothing',
      'A little longer — multiplying always grows things',
      'Half as long — the 1 splits it',
    ],
    answer: 0,
    feedback:
      'Exactly as long. One is the still point of multiplication: ×1 is the do-nothing ' +
      'factor, and the needle sitting ON the pivot is the picture of that. Every other ' +
      'factor will push the copy away from the original — in one of two directions.',
  },
  {
    title: 'Past the pivot: stretch',
    body:
      'The factor top is unlocked. Push the factor past 1 — to 3/2 — and watch the copy ' +
      'reach past the ink shadow where the original ended.',
    demo: { L: 6, p: 3, q: 2 },
    q: 'The factor 3/2 sits past the pivot. The copy of a 6-bar comes out…',
    choices: ['Longer than 6 — a stretch', 'Shorter than 6 — a shrink', 'Exactly 6'],
    answer: 0,
    feedback:
      'Longer: 3/2 × 6 = 18/2 = 9 wholes. But notice what you actually needed: only the ' +
      'SEAT of the factor — 3/2 sits to the RIGHT of 1, so the copy stretches. The exact ' +
      'landing (9) is a detail; the direction was already decided at the gauge.',
  },
  {
    title: 'Below the pivot: shrink',
    body:
      'The factor bottom is unlocked. Pull the factor below 1 — to 1/2 — and watch the copy ' +
      'fall short of the shadow.',
    demo: { L: 6, p: 1, q: 2 },
    q: 'True or false: multiplying always makes things bigger.',
    choices: [
      'False — ×1/2 just shrank the bar in front of me',
      'True — a product is always bigger than what you started with',
      'True, except when you multiply by zero',
    ],
    answer: 0,
    feedback:
      'False — and this is the single most stubborn belief in Grade 5. It grew from years of ' +
      'whole-number factors, which all sit PAST the pivot. Fraction factors can sit below 1, ' +
      'and then multiplying SHRINKS: 1/2 × 6 = 6/2 = 3 wholes. The seat decides, not the ' +
      'word "multiply".',
  },
  {
    title: 'Call it without computing',
    body:
      'The copy’s length label is hidden. The factor is 5/6, the bar is 7 — and the call ' +
      'still reads on the bench, because the needle’s seat is all it needs.',
    demo: { L: 7, p: 5, q: 6 },
    lens: { noPeek: true },
    q: '5/6 × 7 — longer or shorter than 7, WITHOUT working it out?',
    choices: [
      'Shorter — 5/6 sits below the pivot, and that settles it',
      'You must compute 35/6 first to be sure',
      'Longer — 5 and 6 are both bigger than 1',
    ],
    answer: 0,
    feedback:
      'Shorter, and no arithmetic was harmed: 5 < 6, so 5/6 sits below 1, so the product ' +
      'sits below 7. That is CCSS 5.NF.B.5.a word for word — compare the product to one ' +
      'factor using only the SIZE of the other. The audit proves the shortcut never lies.',
  },
  {
    title: 'One, in disguise',
    body:
      'Set the factor to 3/3. The top and bottom both moved — and the copy refuses to budge. ' +
      'Try 5/5, 6/6: the needle lands on the pivot every time.',
    demo: { L: 6, p: 3, q: 3 },
    q: '×3/3 makes the copy…',
    choices: [
      'Identical — 3/3 is the number 1 in a costume',
      'Three times as long — the top says so',
      'A third as long — the bottom says so',
    ],
    answer: 0,
    feedback:
      'Identical: 3/3 = 1, so ×3/3 is the do-nothing factor wearing a busy costume. This is ' +
      'the deep reason renaming a fraction (2/4 for 1/2) never changes an amount — renaming ' +
      'IS multiplying by n/n, and n/n sits exactly on the pivot.',
  },
  {
    title: 'A recipe, called in advance',
    body:
      'Today’s bake needs 3/4 as much flour as yesterday’s 6 cups. The bench shows the bar ' +
      'and the call — before any multiplying.',
    demo: { L: 6, p: 3, q: 4 },
    q: 'Without multiplying: more or less than yesterday’s 6 cups?',
    choices: [
      'Less — the factor 3/4 sits below the pivot',
      'More — a recipe factor always adds',
      'Exactly 6 — factors don’t change amounts',
    ],
    answer: 0,
    feedback:
      'Less: 3/4 < 1, so 3/4 × 6 < 6 — the call costs nothing. (If you do want the number: ' +
      '18/4, which the bench reads as 4 wholes and 2/4 cups.) "As much as" plus a factor ' +
      'below one always means less; past one, always more.',
  },
  {
    title: 'Hit the gold mark',
    body:
      'The bar is pinned. A gold mark waits on the copy’s row. Choose a factor — top and ' +
      'bottom — that lands the copy EXACTLY on it. Any correct name of the factor works.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ScalingLab() {
  const [L, setL] = useState(6);
  const [p, setP] = useState(1);
  const [q, setQ] = useState(1);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const noPeek = !calib && !!(current.lens && current.lens.noPeek);

  const pct = calib && target != null ? closeness(target.L, p, q, target.T) : 0;
  const calibrated = calib && target != null ? isCalibrated(target.L, p, q, target.T) : false;

  sceneRef.current = { L, p, q, noPeek, calib, calibrated, target: calib ? target : null };

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

    const pair = scaledPair(S.L, S.p, S.q);
    const call = callFor(S.p, S.q);

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
      const segs = [
        { kind: 'frac', num: S.p, den: S.q, color: CARMINE },
        { kind: 'text', s: `× ${S.L} =`, color: INK },
      ];
      if (S.noPeek) segs.push({ kind: 'text', s: '?', color: INK_SOFT });
      else segs.push({ kind: 'frac', num: pair.n, den: pair.den, color: CARMINE });
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
    if (!S.noPeek) {
      const mx = toMixed(pair.n, pair.den);
      ctx.fillStyle = GOLD;
      ctx.font = '600 13px system-ui, sans-serif';
      if (pair.den > 1 && mx.w > 0)
        ctx.fillText(
          mx.r === 0 ? `= ${mx.w} whole${mx.w > 1 ? 's' : ''} exactly` : `= ${mx.w} whole${mx.w > 1 ? 's' : ''} and ${mx.r}/${pair.den}`,
          W / 2,
          sayY + fs * 1.8
        );
    } else {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 13px system-ui, sans-serif';
      ctx.fillText('no peeking — the seat of the factor already knows', W / 2, sayY + fs * 1.8);
    }

    /* ---- shared scale: the copy can reach 6 × the bar ---------------------- */
    const padX = 40;
    const u = (W - padX * 2) / (6.2 * S.L); // px per unit; fixed while k moves
    const x0 = padX;
    const barH = 40;

    /* the ORIGINAL bar */
    const oy = 128;
    ctx.fillStyle = CARMINE;
    rr(x0, oy, S.L * u, barH, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px ui-monospace, Menlo, monospace';
    if (S.L * u > 44) ctx.fillText(String(S.L), x0 + (S.L * u) / 2, oy + barH / 2);
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the original', x0, oy - 12);
    ctx.textAlign = 'center';

    /* ---- THE FACTOR GAUGE: zero, the gold pivot at 1, and the needle ------- */
    const gy = oy + barH + 52;
    const gx0 = x0;
    const gx1 = x0 + Math.min(W - padX * 2, 6 * ((W - padX * 2) / 6.2));
    const gUnit = (gx1 - gx0) / 6; // the gauge spans factors 0 … 6
    ctx.strokeStyle = 'rgba(28,43,58,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx0, gy + 0.5);
    ctx.lineTo(gx1, gy + 0.5);
    ctx.stroke();
    /* zero */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
    ctx.fillText('0', gx0, gy + 16);
    /* THE PIVOT */
    const px1 = gx0 + gUnit;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px1, gy - 16);
    ctx.lineTo(px1, gy + 10);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '700 14px ui-monospace, Menlo, monospace';
    ctx.fillText('1', px1, gy + 24);
    /* the needle at k = p/q */
    const kx = gx0 + gUnit * (S.p / S.q);
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.moveTo(kx, gy - 4);
    ctx.lineTo(kx - 6, gy - 18);
    ctx.lineTo(kx + 6, gy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 12.5px ui-monospace, Menlo, monospace';
    ctx.fillText(`${S.p}/${S.q}`, kx, gy - 30);
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the factor gauge', gx0, gy - 30);
    ctx.textAlign = 'center';

    /* ---- the SCALED COPY ---------------------------------------------------- */
    const cy = gy + 52;
    const copyW = S.L * u * (S.p / S.q);
    ctx.fillStyle = 'rgba(200,30,79,0.35)';
    rr(x0, cy, copyW, barH, 5);
    ctx.fill();
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 1.6;
    rr(x0, cy, copyW, barH, 5);
    ctx.stroke();
    /* the shadow of the original's end */
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 + S.L * u, cy - 8);
    ctx.lineTo(x0 + S.L * u, cy + barH + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('where the original ends', x0 + S.L * u, cy + barH + 20);
    if (!S.noPeek && copyW > 50) {
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, Menlo, monospace';
      ctx.fillText(`${pair.n}/${pair.den}`, x0 + copyW / 2, cy + barH / 2);
    }
    ctx.fillStyle = INK;
    ctx.font = '600 12.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the copy', x0, cy - 12);
    ctx.textAlign = 'center';

    /* the capstone's gold mark */
    if (S.calib && S.target) {
      const tx = x0 + S.target.T * u;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(tx, cy - 14);
      ctx.lineTo(tx, cy + barH + 6);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = '700 12.5px system-ui, sans-serif';
      ctx.fillText(`the mark: ${S.target.T}`, tx, cy - 24);
    }

    /* ---- THE CALL: read from the seat, never from the copy ------------------ */
    const vy = cy + barH + 44;
    const callColor = call === 'UNCHANGED' ? GOLD : CARMINE;
    ctx.fillStyle = callColor;
    ctx.font = '700 15px ui-monospace, Menlo, monospace';
    ctx.fillText(call, W / 2, vy);
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 12px system-ui, sans-serif';
    ctx.fillText(
      seat(S.p, S.q) === 0
        ? 'the needle sits ON the pivot — the factor is 1 in some costume'
        : seat(S.p, S.q) > 0
          ? 'the needle sits PAST the pivot — no arithmetic needed'
          : 'the needle sits BELOW the pivot — no arithmetic needed',
      W / 2,
      vy + 20
    );
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
      setL(dm.L);
      setP(dm.p);
      setQ(dm.q);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setL(t.L);
      setP(1);
      setQ(1);
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
      setL(dm.L);
      setP(dm.p);
      setQ(dm.q);
    } else if (calib) {
      setP(1);
      setQ(1);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'len') setL(clampInt(raw, 3, 8));
    else if (key === 'top') setP(clampInt(raw, 1, 6));
    else setQ(clampInt(raw, 1, 6));
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken =
    `The factor ${p}/${q} sits ${seat(p, q) === 0 ? 'on' : seat(p, q) > 0 ? 'past' : 'below'} one, so the copy of ${L} is ${callFor(p, q).toLowerCase()}.` +
    (calib && target ? ` The gold mark waits at ${target.T}.` : '');

  return (
    <div className="scalelab">
      <header className="head">
        <h1>Multiplication as Scaling</h1>
        <p className="lede">
          Multiplying <em>resizes</em>. Where the factor sits relative to <em>one</em> decides
          everything: past 1 stretches, below 1 shrinks — and you can call it before you compute.
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
            {calibrated ? ' Calibrated — the copy lands exactly on the gold mark.' : ''}
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
            {DIALS.filter((dl) => !(calib && dl.key === 'len')).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'len' ? L : dl.key === 'top' ? p : q;
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
                    style={{ accentColor: dl.color === SLATE ? '#5b6b7b' : dl.color }}
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
                <span className="target-k">Land the copy on</span>
                <span className="target-word">{target.T}</span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${p}/${q} × ${target.L} lands exactly on ${target.T}`
                    : `the bar is ${target.L}; pick the factor that ${target.T > target.L ? 'stretches' : 'shrinks'} it there`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'landed exactly' : `${p}/${q} × ${target.L} = ${target.L * p}/${q}`}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">aim for {target.T}</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setL(t.L);
                  setP(1);
                  setQ(1);
                }}
              >
                New mark
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
                  setL(6);
                  setP(1);
                  setQ(1);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">k &gt; 1 stretches · k = 1 holds · k &lt; 1 shrinks · n/n = 1</span>{' '}
        &nbsp;·&nbsp; multiplication as scaling (CCSS 5.NF.B.5): compare the product to one factor
        from the <em>seat</em> of the other, without performing the multiplication — the shortcut
        is a theorem, and the audit proves it never lies.
      </footer>

      <style jsx>{`
        .scalelab {
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
        :global(.scalelab) :focus-visible {
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
