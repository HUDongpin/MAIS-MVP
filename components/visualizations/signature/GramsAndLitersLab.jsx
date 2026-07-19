'use client';

/* ============================================================================
   GramsAndLitersLab — an interactive "bench" for MASS AND LIQUID VOLUME:
   grams and kilograms, milliliters and liters — read off the two instruments
   that actually measure them.

        the DIAL SCALE:  a needle against a tick face  →  "650 g"
        the BEAKER:      a waterline against graduations →  "375 mL"
        …then the one-step problems: pour 250 mL more; lift the 150 g box off.

   Built for MAIS (math AI system, www.mais.ac), K-12.  This is a GRADE 3
   lab — CCSS 3.MD.A.2 is the anchor: measure and estimate liquid volumes
   and masses of objects using standard units of grams, kilograms, and
   liters; add, subtract, multiply, or divide to solve one-step word
   problems about masses or volumes given in the same units.  Each of the
   four operations has an instrument-shaped home here: pouring in adds,
   lifting off subtracts, pouring the SAME mug again and again multiplies
   (and, read backwards, asks a division question).

   MERGED IN (2026-07-16, when the M1 duplicate MassVolumeLab was retired):
   the two PERCEPTION TRAPS and the pours-multiply step.  Big is not heavy —
   the pillow dwarfs the platform and under-weighs the hand-sized brick
   (drawn size is decorrelated from the reading, asserted by the audit).
   Tall is not more — the tall thin jug towers over the short wide one and
   holds 400 mL to its 600, settled by emptying both into the same beaker.
   Eyes guess; instruments answer — which is this lab's thesis anyway.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge with
   a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE NEEDLE AND THE WATERLINE."
     Mass and liquid volume are invisible attributes — you cannot see 650
     grams the way you can see a length — so the whole Grade-3 skill is
     READING AN INSTRUMENT: finding where the needle (or the waterline)
     rests among ticks that are mostly unlabelled.  The dial scale's face is
     labelled every 200 g with small ticks every 50; the beaker's wall is
     labelled every 200 mL the same way; and the lab's readings always land
     BETWEEN labels, because label-to-label is where the actual skill lives
     (400… one tick, two ticks… 500).  Estimation gets its own steps with
     the benchmarks a child can hold: an egg is about 60 g, not 60 kg; a
     teaspoon is 5 mL; a big water bottle is 1 L; 1 kg is 1000 g.  Then the
     instruments do word problems the honest way: POUR 250 mL into the
     beaker and the waterline climbs to the sum; LIFT the 150 g box off the
     scale and the needle drops to the difference — addition and subtraction
     as things the instruments physically do.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • EquationLab owns the two-sided balance and its beam.  This lab's
       scale is a SINGLE-PLATFORM DIAL scale — nothing is compared against
       anything; a needle points at a number.  No beam, no second side.
     • MeasurementLab owns LENGTH: unit rods laid end to end, the count-
       times-size invariant, estimation of length.  Nothing here is laid
       along anything; mass and volume are read, not iterated, and no rod
       or unit block appears.
     • VolumeLab (5.MD.C) owns SOLID volume as packed unit cubes and
       V = B·h.  This lab's liquid fills a container to a LEVEL; no cube is
       ever packed, and the word "volume" here always means the liquid kind
       a beaker measures.
     • UnitConversionLab owns conversion as multiplying by a disguised 1,
       with its two aligned rulers.  This lab states 1 kg = 1000 g and
       1 L = 1000 mL as benchmark FACTS for estimation and never converts:
       every problem stays in one unit, exactly as 3.MD.A.2 specifies.
     • LinePlotLab owns measure-then-mark data collection.  No data set is
       gathered here; each reading stands alone.
     • MoneyLab owns the coin tray.  Nothing here is counted in cents.

   One-accent discipline: CARMINE is THE READING — the needle, the
   waterline, and the number they point at.  BLUE is the liquid itself (and
   only the liquid).  GOLD is the INSTRUMENT — tick faces, graduations, the
   posted order line.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes an eight-year-old):
     • Readings are INTEGER multiples of 25 (grams or milliliters), 0…1000.
       The instruments' geometry maps value → needle angle and value →
       waterline height linearly, and the audit checks the tick arithmetic
       (label below, small ticks past it) for every reachable reading.
     • Pouring and lifting are GATED, never clamped: you cannot pour past
       the beaker's 1000 mL brim, and you cannot lift more than sits on the
       scale.  reading = base ± change is exact integer arithmetic, audited
       over every pair.
     • The benchmark facts are exact: 1 kg = 1000 g, 1 L = 1000 mL.
     • The calibration stamp is the integer identity base + pour === order.
       The meter reads 100 only at equality (99 is its ceiling everywhere
       else), audited over every order × every reachable pour.
   Verified by audit-gramsandliters.mjs (numeric proof + source greps) and
   verify-gramsandliters.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/GramsAndLitersLab.jsx
     2. Import and render it:
          import GramsAndLitersLab from './GramsAndLitersLab';
          export default function Page() { return <GramsAndLitersLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the base amount,
              the change, the lesson step, answers, the posted order).
     MODEL  — pure integer arithmetic on gram/milliliter counts; the
              instruments' geometry is linear mapping; no pixels in the math.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  A base amount and, later, a pour / lift change.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the reading: needle, waterline, the number
const BLUE = '#3f74a6'; // the liquid
const GOLD = '#b98718'; // the instrument: ticks, graduations, the order line

const DIALS = [
  { key: 'amount', name: 'Amount', role: 'what sits on the scale / in the beaker', min: 0, max: 1000, unlock: 0, color: CARMINE },
  { key: 'change', name: 'The change', role: 'pour in — or lift off', min: 0, max: 500, unlock: 6, color: GOLD },
];

const CALIB_STEP = 9;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Integer gram/milliliter counts; tick arithmetic; gates.
   ------------------------------------------------------------------------- */
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const clamp25 = (v, lo, hi) => clampInt(Math.round(v / 25) * 25, lo, hi);

/* the benchmark facts — stated, never converted with */
const GRAMS_IN_KG = 1000;
const ML_IN_LITER = 1000;

/* the instrument face: labels every 200, small ticks every 50 */
const LABEL_EVERY = 200;
const TICK_EVERY = 50;
const labelBelow = (r) => Math.floor(r / LABEL_EVERY) * LABEL_EVERY;
const ticksPast = (r) => (r - labelBelow(r)) / TICK_EVERY;

/* the one-step problems the instruments do physically */
const readingOf = (base, change, dir) => base + dir * change;
const canPour = (base, change) => base + change <= 1000;
const pourMax = (base) => 1000 - base;
const canLift = (base, change) => change <= base;
const liftMax = (base) => base;

/* the perception traps (merged in from the retired MassVolumeLab when the
   M1 duplicate was resolved, 2026-07-16): drawn size is DECORRELATED from
   the reading — the pillow out-sizes the brick and under-weighs it, and
   the tall jug out-heights the wide one and under-holds it.  The audit
   asserts both inversions against these shipped constants. */
const PILLOW = { g: 250, w: 150, h: 64 }; // huge on screen, light on the dial
const BRICK = { g: 650, w: 56, h: 30 }; // hand-sized, heavy
const TALL_JUG = { mL: 400, h: 120, w: 34 }; // towers, holds less
const WIDE_JUG = { mL: 600, h: 66, w: 110 }; // squats, holds more

/* repeated pouring is multiplication: n identical mugs of `cup` mL */
const MUL = { n: 3, cup: 250 };

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "Fill to the order line."  A gold order line is
   posted on the beaker; the starting amount is pinned; choose the pour so
   the waterline climbs EXACTLY to the order.

   No false stamp, provably: CALIBRATED ⟺ base + pour === order, an integer
   identity.  The meter reads 100 only at equality (99 is its ceiling
   everywhere else), audited over every order × every reachable pour.
   ------------------------------------------------------------------------- */
function makeTarget(prev) {
  let B, T;
  do {
    B = 100 + 25 * Math.floor(Math.random() * 17); // 100 … 500
    const room = Math.min(500, 1000 - B);
    T = B + 100 + 25 * Math.floor(Math.random() * ((room - 100) / 25 + 1)); // B+100 … B+room
  } while (prev && B === prev.B && T === prev.T);
  return { B, T };
}
const closeness = (reading, T) =>
  reading === T ? 100 : Math.max(0, Math.min(99, Math.round(100 - (Math.abs(T - reading) * 100) / 1000)));
const isCalibrated = (reading, T) => reading === T;

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; every scene a step's words depend on
   is pinned by STEPS[].demo; the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The needle reads the grams',
    body:
      'A parcel sits on the dial scale. The face is labelled every 200 grams, with a small ' +
      'tick every 50. The needle rests two ticks past the 400 label — read it.',
    demo: { amt: 500, chg: 0 },
    mode: 'scale',
    q: 'Labels every 200, ticks every 50, needle two ticks past 400. The parcel weighs…',
    choices: [
      '500 g — 400, then 450, then 500',
      '420 g — two little steps past 400',
      '600 g — the next big label along',
    ],
    answer: 0,
    feedback:
      'Five hundred grams: each small tick is worth 50, so two ticks past the 400 label is ' +
      '400 + 50 + 50 = 500. Reading between the labels is the whole skill — instruments ' +
      'rarely land you on a printed number, and the ticks are how you walk from one.',
  },
  {
    title: 'Grams, or kilograms?',
    body:
      'A gram is tiny — a paperclip. A kilogram is 1000 grams — a big bottle of water. ' +
      'Choosing the sensible unit is half of measuring. Slide the dial and feel the range.',
    demo: { amt: 50, chg: 0 },
    mode: 'scale',
    q: 'A hen’s egg weighs about…',
    choices: ['60 g — sixty paperclips of mass', '60 kg — like a whole third-grader', '6 kg — a big bag of rice'],
    answer: 0,
    feedback:
      'About 60 grams. A kilogram is a THOUSAND grams — 60 kg is a person, not an egg. ' +
      'Benchmarks make estimates honest: paperclip ≈ 1 g, apple ≈ 200 g, water bottle ≈ 1 kg. ' +
      'Hold those three and you can sanity-check any mass a label claims.',
  },
  {
    title: 'Big is not heavy',
    body:
      'The huge pillow goes on the scale: 250 g. The little brick already read 650. ' +
      'Look at the needle, not the size.',
    demo: { amt: 250, chg: 0 },
    mode: 'scale',
    pillow: true,
    q: 'The pillow fills the whole platform. Which is heavier?',
    choices: [
      'The brick — 650 beats 250, says the needle',
      'The pillow — bigger is heavier',
      'They match — each fills a hand',
    ],
    answer: 0,
    feedback:
      'The brick, by 400 g. A pillow is mostly air; a brick is solid stone. Size says how ' +
      'much room a thing takes — the needle says its mass. Eyes guess; instruments answer.',
  },
  {
    title: 'The waterline reads the milliliters',
    body:
      'Now the beaker. Same trick, standing up: graduation lines every 50 mL, labels every ' +
      '200. The waterline rests one tick above the 600 line.',
    demo: { amt: 650, chg: 0 },
    mode: 'beaker',
    q: 'Labels every 200, lines every 50, waterline one line above 600. The beaker holds…',
    choices: ['650 mL — 600 and one 50-step more', '601 mL — just past 600', '700 mL — call it the next label'],
    answer: 0,
    feedback:
      'Six hundred and fifty milliliters. The beaker is the dial scale turned on its side: ' +
      'labels anchor you, ticks walk you, and the waterline is the needle. One line above ' +
      '600 is 650 — not 601 (a line is worth 50, not 1) and not 700 (never round a reading).',
  },
  {
    title: 'Milliliters, or liters?',
    body:
      'A milliliter is a droplet — a teaspoon holds 5. A liter is 1000 milliliters — the big ' +
      'water bottle. Which unit fits the thing?',
    demo: { amt: 250, chg: 0 },
    mode: 'beaker',
    q: 'A full bathtub holds about…',
    choices: ['150 L — a hundred and fifty big bottles', '150 mL — a juice glass', '1.5 L — one big bottle and a half'],
    answer: 0,
    feedback:
      'Around 150 liters — bathtubs are enormous once you count in bottles. 150 mL is a ' +
      'juice glass, and 1.5 L would barely wet the bottom. A liter is 1000 mL: teaspoon 5 mL, ' +
      'mug ≈ 250 mL, big bottle = 1 L — the three benchmarks worth memorising.',
  },
  {
    title: 'Tall is not more',
    body:
      'Two mystery jugs, each emptied into the beaker in turn. The tall thin one reached ' +
      '400 mL; the short wide one, 600.',
    demo: { amt: 600, chg: 0 },
    mode: 'beaker',
    jugs: true,
    q: 'The tall jug towers over the wide one. Which held more?',
    choices: [
      'The wide one — the waterline reached 600 against 400',
      'The tall one — taller is more',
      'Equal — jugs are jugs',
    ],
    answer: 0,
    feedback:
      'The wide one. Tall is only one of three ways to be big, and the wide jug wins the ' +
      'other two. Same beaker, same graduations — read the waterline, not the silhouette.',
  },
  {
    title: 'Pour in',
    body:
      'The beaker shows 375 mL. THE CHANGE is unlocked — pour in 250 more and watch the ' +
      'waterline climb to the sum. The instrument does the addition.',
    demo: { amt: 375, chg: 250 },
    mode: 'beaker',
    dir: 1,
    q: '375 mL in the beaker, pour in 250 mL more. The waterline rises to…',
    choices: ['625 mL — the waterline adds the amounts', '125 mL — the difference', '600 mL — round numbers are friendlier'],
    answer: 0,
    feedback:
      '625 mL: 375 + 250. Pouring IS addition — the new water stacks on the old, and the ' +
      'waterline reports the total. (Subtracting 250 would be pouring OUT; and instruments ' +
      'never round: the line is at 625, not "about 600".)',
  },
  {
    title: 'Pour after pour',
    body:
      'One mug, 250 mL, poured three times. The waterline climbs the same step each pour: ' +
      '250, 500, 750.',
    demo: { amt: 750, chg: 0 },
    mode: 'beaker',
    mul: true,
    q: 'Three pours of the 250 mL mug fill the beaker to…',
    choices: [
      '750 mL — 3 × 250: pouring again and again is multiplying',
      '253 mL — 250 plus the 3 pours',
      '500 mL — the last pour spilt',
    ],
    answer: 0,
    feedback:
      'Three equal pours multiply: 3 × 250 = 750. Read backwards — how many mugs fill 750? — ' +
      'the same picture asks a division question. A fourth mug would land exactly on the brim.',
  },
  {
    title: 'Lift the box off',
    body:
      'The scale reads 800 g — but that is the parcel AND its box. The box alone weighs ' +
      '150 g. Lift it off: the needle drops to the parcel alone.',
    demo: { amt: 800, chg: 150 },
    mode: 'scale',
    dir: -1,
    q: 'Parcel and box together: 800 g. The box alone: 150 g. The parcel weighs…',
    choices: ['650 g — the needle drops by the box’s share', '950 g — add them up', '150 g — the box is the answer'],
    answer: 0,
    feedback:
      '650 grams: 800 − 150. Lifting off IS subtraction — the needle falls by exactly what ' +
      'left the platform. Every "how much without the container?" problem is this one move, ' +
      'done by the instrument in front of you.',
  },
  {
    title: 'Fill to the order line',
    body:
      'A gold order line is posted on the beaker, and the starting amount is pinned. Choose ' +
      'the pour so the waterline lands EXACTLY on the order.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function GramsAndLitersLab() {
  const [amt, setAmt] = useState(500);
  const [chg, setChg] = useState(0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const mode = calib ? 'beaker' : current.mode || 'scale';
  const dir = calib ? 1 : current.dir || 0;

  const reading = readingOf(amt, dir === 0 ? 0 : chg, dir === 0 ? 1 : dir);
  const pct = calib && target != null ? closeness(reading, target.T) : 0;
  const calibrated = calib && target != null ? isCalibrated(reading, target.T) : false;

  sceneRef.current = {
    amt,
    chg,
    dir,
    mode,
    reading,
    calib,
    calibrated,
    target: calib ? target : null,
    pillow: !!current.pillow,
    jugs: !!current.jugs,
    mul: !!current.mul,
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

    const unit = S.mode === 'scale' ? 'g' : 'mL';

    /* ---- the SAY band ------------------------------------------------------ */
    const sayY = 34;
    ctx.fillStyle = CARMINE;
    ctx.font = `700 ${Math.min(23, W / 25)}px ui-monospace, Menlo, monospace`;
    ctx.fillText(
      S.mul
        ? `${MUL.n} × ${MUL.cup} = ${S.reading} ${unit}`
        : S.dir !== 0 && S.chg > 0
          ? `${S.amt} ${S.dir > 0 ? '+' : '−'} ${S.chg} = ${S.reading} ${unit}`
          : `${S.reading} ${unit}`,
      W / 2,
      sayY
    );
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 600 13px system-ui, sans-serif';
    ctx.fillText(
      S.mode === 'scale'
        ? `the ${labelBelow(S.reading)} label, then ${ticksPast(S.reading)} tick${ticksPast(S.reading) === 1 ? '' : 's'} of 50`
        : `the ${labelBelow(S.reading)} line, then ${ticksPast(S.reading)} step${ticksPast(S.reading) === 1 ? '' : 's'} of 50`,
      W / 2,
      sayY + 25
    );

    if (S.mode === 'scale') {
      /* ---- THE DIAL SCALE --------------------------------------------------- */
      const cx = W / 2;
      const cy = H * 0.56;
      const R = Math.min(W, H) * 0.27;
      /* face */
      ctx.fillStyle = '#fdfdfa';
      ctx.beginPath();
      ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
      ctx.stroke();
      /* value → angle: 0 at 7:30, 1000 at 4:30 (a 270° sweep) */
      const angOf = (v) => (0.75 + 1.5 * (v / 1000)) * Math.PI;
      for (let v = 0; v <= 1000; v += TICK_EVERY) {
        const a = angOf(v);
        const isLabel = v % LABEL_EVERY === 0;
        const r1 = R - (isLabel ? 14 : 7);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = isLabel ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
        if (isLabel) {
          ctx.fillStyle = INK;
          ctx.font = '600 11.5px ui-monospace, Menlo, monospace';
          ctx.fillText(String(v), cx + Math.cos(a) * (R - 27), cy + Math.sin(a) * (R - 27));
        }
      }
      /* the needle */
      const na = angOf(S.reading);
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(na) * 14, cy - Math.sin(na) * 14);
      ctx.lineTo(cx + Math.cos(na) * (R - 10), cy + Math.sin(na) * (R - 10));
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      /* the platform and parcel */
      const py = cy - R - 44;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 70, py + 26.5);
      ctx.lineTo(cx + 70, py + 26.5);
      ctx.stroke();
      if (S.pillow) {
        /* the trap: the pillow dwarfs the platform yet barely moves the needle */
        ctx.fillStyle = '#e9dfc8';
        rr(cx - PILLOW.w / 2, py + 24 - PILLOW.h, PILLOW.w, PILLOW.h, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.4;
        rr(cx - PILLOW.w / 2, py + 24 - PILLOW.h, PILLOW.w, PILLOW.h, 20);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText('?', cx, py + 24 - PILLOW.h / 2);
        /* the brick, hand-sized, waiting beside — its reading already taken */
        ctx.fillStyle = '#cbb9a4';
        rr(cx + 106, py + 24 - BRICK.h, BRICK.w, BRICK.h, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        rr(cx + 106, py + 24 - BRICK.h, BRICK.w, BRICK.h, 4);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.fillText(`the brick read ${BRICK.g} g`, cx + 106 + BRICK.w / 2, py + 40);
      } else {
        ctx.fillStyle = '#e9dfc8';
        rr(cx - 34, py - 6, 68, 30, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(28,43,58,0.5)';
        ctx.lineWidth = 1.4;
        rr(cx - 34, py - 6, 68, 30, 6);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText('?', cx, py + 9);
      }
      /* the lifted box (subtract mode) */
      if (S.dir < 0 && S.chg > 0) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        rr(cx + 92, py - 18, 56, 24, 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GOLD;
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.fillText(`the box, off: ${S.chg} g`, cx + 120, py + 20);
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('the dial scale — labels every 200 g, ticks every 50', cx, cy + R + 38);
    } else {
      /* ---- THE BEAKER --------------------------------------------------------- */
      const bw = Math.min(W * 0.3, 190);
      const bh = H * 0.58;
      const bx = W / 2 - bw / 2;
      const by = H * 0.2;
      /* liquid */
      const levelY = by + bh - (S.reading / 1000) * bh;
      ctx.fillStyle = 'rgba(63,116,166,0.3)';
      ctx.fillRect(bx + 2, levelY, bw - 4, by + bh - levelY);
      /* the waterline — the reading itself */
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 8, levelY);
      ctx.lineTo(bx + bw + 8, levelY);
      ctx.stroke();
      /* vessel */
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by);
      ctx.stroke();
      /* graduations */
      for (let v = 0; v <= 1000; v += TICK_EVERY) {
        const gy = by + bh - (v / 1000) * bh;
        const isLabel = v % LABEL_EVERY === 0;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = isLabel ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(bx, gy);
        ctx.lineTo(bx + (isLabel ? 26 : 14), gy);
        ctx.stroke();
        if (isLabel && v > 0) {
          ctx.fillStyle = INK;
          ctx.font = '600 11px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(String(v), bx + 30, gy);
          ctx.textAlign = 'center';
        }
      }
      /* the posted order line (capstone) */
      if (S.calib && S.target) {
        const oy = by + bh - (S.target.T / 1000) * bh;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.6;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(bx - 22, oy);
        ctx.lineTo(bx + bw + 22, oy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GOLD;
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`the order: ${S.target.T} mL`, bx + bw + 28, oy);
        ctx.textAlign = 'center';
      }
      /* the two mystery jugs (the tall-is-not-more trap) */
      if (S.jugs) {
        const baseY = by + bh;
        const tx = bx - 118;
        const wx = bx - 258;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, baseY - TALL_JUG.h, TALL_JUG.w, TALL_JUG.h);
        ctx.strokeRect(wx, baseY - WIDE_JUG.h, WIDE_JUG.w, WIDE_JUG.h);
        ctx.fillStyle = INK;
        ctx.font = '700 13px ui-monospace, Menlo, monospace';
        ctx.fillText('?', tx + TALL_JUG.w / 2, baseY - TALL_JUG.h / 2);
        ctx.fillText('?', wx + WIDE_JUG.w / 2, baseY - WIDE_JUG.h / 2);
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 11px system-ui, sans-serif';
        ctx.fillText('the tall jug', tx + TALL_JUG.w / 2, baseY + 14);
        ctx.fillText('the short wide jug', wx + WIDE_JUG.w / 2, baseY + 14);
        /* where the tall jug's water stopped, ghosted on the same beaker */
        const gy = by + bh - (TALL_JUG.mL / 1000) * bh;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(bx - 16, gy);
        ctx.lineTo(bx + bw + 16, gy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GOLD;
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`the tall jug reached ${TALL_JUG.mL}`, bx + bw + 22, gy);
        ctx.textAlign = 'center';
      }
      /* the mug, poured again and again (the multiply step) */
      if (S.mul) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - 34);
        ctx.lineTo(bx + bw / 2, by - 8);
        ctx.stroke();
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - 4);
        ctx.lineTo(bx + bw / 2 - 5, by - 12);
        ctx.lineTo(bx + bw / 2 + 5, by - 12);
        ctx.closePath();
        ctx.fill();
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.fillText(`the mug: ${MUL.cup} mL, × ${MUL.n} pours`, bx + bw / 2, by - 44);
      }
      /* pour arrow (add mode) */
      if (S.dir > 0 && S.chg > 0) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - 34);
        ctx.lineTo(bx + bw / 2, by - 8);
        ctx.stroke();
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - 4);
        ctx.lineTo(bx + bw / 2 - 5, by - 12);
        ctx.lineTo(bx + bw / 2 + 5, by - 12);
        ctx.closePath();
        ctx.fill();
        ctx.font = '600 11.5px system-ui, sans-serif';
        ctx.fillText(`pouring in ${S.chg} mL`, bx + bw / 2, by - 44);
      }
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('the beaker — labels every 200 mL, lines every 50', W / 2, by + bh + 22);
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
      setAmt(dm.amt);
      setChg(dm.chg);
    }
    if (STEPS[step].calib) {
      const t = makeTarget(null);
      setTarget(t);
      setAmt(t.B);
      setChg(0);
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
      setAmt(dm.amt);
      setChg(dm.chg);
    } else if (calib && target) {
      setChg(0);
    }
  };

  const setDial = (key, raw) => {
    if (key === 'amount') {
      const na = clamp25(raw, 0, 1000);
      setAmt(na);
      setChg((v) => Math.min(v, dir < 0 ? liftMax(na) : pourMax(na)));
    } else {
      setChg(clamp25(raw, 0, dir < 0 ? liftMax(amt) : pourMax(amt)));
    }
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const unit = mode === 'scale' ? 'grams' : 'milliliters';
  const spoken =
    `The ${mode === 'scale' ? 'dial scale' : 'beaker'} reads ${reading} ${unit}.` +
    (dir !== 0 && chg > 0 ? ` That is ${amt} ${dir > 0 ? 'plus' : 'minus'} ${chg}.` : '') +
    (calib && target ? ` The order line waits at ${target.T} milliliters.` : '');

  return (
    <div className="gllab">
      <header className="head">
        <h1>Grams &amp; Liters: Read the Instrument</h1>
        <p className="lede">
          Mass and liquid volume are invisible — so we read them off instruments: a <em>needle</em>{' '}
          against ticks, a <em>waterline</em> against graduations. Pour in to add; lift off to
          subtract.
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
            {calibrated ? ' Calibrated — the waterline sits exactly on the order.' : ''}
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
            {DIALS.filter((dl) => !(calib && dl.key === 'amount')).map((dl) => {
              const unlocked = step >= dl.unlock;
              const value = dl.key === 'amount' ? amt : chg;
              const max = dl.key === 'change' ? (dir < 0 ? liftMax(amt) : Math.min(dl.max, pourMax(amt))) : dl.max;
              const role =
                dl.key === 'change'
                  ? dir < 0
                    ? 'how much lifts OFF the scale'
                    : 'how much pours IN'
                  : dl.role;
              return (
                <label className={'dial' + (unlocked ? '' : ' locked')} key={dl.key}>
                  <span className="dk" style={{ color: dl.color }}>
                    {dl.name}
                  </span>
                  <span className="drole">{unlocked ? role : 'unlocks soon'}</span>
                  <input
                    type="range"
                    min={dl.min}
                    max={max}
                    step={25}
                    value={value}
                    disabled={!unlocked}
                    aria-label={`${dl.name} — ${role}`}
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
                <span className="target-k">Fill to the order line</span>
                <span className="target-word">{target.T} mL</span>
                <span className="target-hint mono">
                  {calibrated
                    ? `${target.B} + ${chg} = ${target.T} — exactly on the line`
                    : `the beaker starts at ${target.B} mL — choose the pour`}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">
                  {calibrated ? 'exactly on the order' : reading > target.T ? 'over-poured' : 'pouring…'}
                </span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {target.B} + {chg} = {reading}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const t = makeTarget(target);
                  setTarget(t);
                  setAmt(t.B);
                  setChg(0);
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
                  setAmt(500);
                  setChg(0);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">needle: 400 + 2 ticks = 500 g · pour: 375 + 250 = 625 mL</span>{' '}
        &nbsp;·&nbsp; measure and estimate masses and liquid volumes in grams, kilograms, and
        liters (CCSS 3.MD.A.2), and solve one-step problems the instruments&apos; own way —
        pouring adds, lifting off subtracts, and readings land between the labels on purpose.
      </footer>

      <style jsx>{`
        .gllab {
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
          grid-template-columns: 96px 1fr 46px;
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
          font-size: 16px;
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
        :global(.gllab) :focus-visible {
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
