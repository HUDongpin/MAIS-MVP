'use client';

/* ============================================================================
   PiLab — an interactive "bench" for π, THE CIRCUMFERENCE, AND THE AREA OF A
   CIRCLE: the number π as a RATIO every circle shares, discovered by rolling;
   C = πd = 2πr read off the track; and A = πr² assembled by combing the disc
   into a near-rectangle.

        roll any wheel one full turn → the track is always π diameters
        comb the disc into slices    → height r, base πr  ⇒  A = πr²

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 7 lab — CCSS
   7.G.B.4 is the anchor: "Know the formulas for the area and circumference
   of a circle and use them to solve problems; give an informal derivation
   of the relationship between the circumference and area of a circle."
   The "informal derivation" clause is the whole second act.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated
   on ANSWERED (not correct), and a calibration challenge with a live meter
   and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE ROLLING WHEEL."
     A wheel with its diameter painted on it as a gold stick ROLLS along the
     ground — drag it, or work the roll dial — and lays down a track.  Lay
     diameter-sticks along the track and count: 1, 2, 3 … and a little left
     over, 3.14159… of them, and the leftover is ALWAYS THE SAME FRACTION,
     for every wheel on the dial.  That invariant count IS π: not a number
     somebody chose, not 3.14, not 22/7 — the ratio C/d that being a circle
     forces on every circle.  The most surprising gap in this library (four
     conic labs and no π) closes with the oldest measurement in geometry.
     THE SECOND ACT — THE COMB.  The disc is cut into n equal slices and
     combed into an alternating up/down row: a bumpy shape whose amount of
     disc is EXACTLY unchanged (pieces moved, nothing stretched), whose
     height is one radius, and whose bumpy base is half the rim — πr — since
     half the slices point down.  Slide n up and the bumps flatten: the
     circle was secretly a rectangle, r tall and πr wide.  A = πr², derived,
     not decreed.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • CylinderLab owns the UNROLL: a 3-D tube's lateral surface peeling
       flat into a 2πr × h rectangle.  Nothing here peels or unrolls, and
       the word never appears: the wheel ROLLS — rotation plus travel, a
       track laid on the ground, a count made in diameter-sticks.  A tube
       becoming flat and a wheel laying a track are different gestures.
     • AreaLab owns area as a COUNT of unit squares and the CUT-AND-SLIDE
       (one overhanging triangle slid across to fill a notch).  Nothing here
       is counted in unit squares and no piece slides into a notch: the
       comb REARRANGES every slice at once, and its payoff is a shape that
       only BECOMES straight as the slices thin — an informal limit, which
       cut-and-slide never needs.
     • UnitCircleLab owns the WRAP on the circle of radius exactly 1 —
       radian measure as arc length, cosine and sine as coordinates.  This
       lab wraps nothing, never says "radian", and works on circles of
       every size — that is its whole point.  (Its C = 2πr is the fact the
       unit-circle bench inherits as a rim of 2π.)
     • CircleLab owns the circle's EQUATION and the radius triangle.  No
       coordinates and no equation of a circle appear here.
     • FractionLab owns the pie cut into q sectors as a picture of p/q.
       The comb's slices are never shaded as a fraction and never counted
       against a whole — they are moved, and the subject is their total.

   Colour (the SystemsOfEquationsLab three-colour relaxation, documented):
   CARMINE = π itself — the leftover on the track, the count 3.14159…, and
   the formulas it powers (C = πd, A = πr²).  BLUE = the wheel and the disc,
   the objects being measured.  GOLD = the measuring apparatus — the
   diameter-stick, the track's tick marks, the comb's slices in motion.
   GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a twelve-year-old):
     • π is never typed as a decimal into the model: every circumference is
       computed as d·π from the diameter dial (an integer), every area as
       r²·π, and the RATIO the lab celebrates is derived — trackLength(d)/d
       is proved constant across the whole dial in the audit, to machine
       precision, because it is π by construction and the construction is
       the claim.  Decimals shown to the student are always marked ≈ and
       always 3.14159…, never 3.14 and never an equals sign.
     • The comb conserves area EXACTLY and symbolically: n slices of angle
       2π/n each; the audit proves the angles sum to 2π for every even n on
       the dial and that no transform in the comb scales a slice (rotation
       and translation only — the drawing code is grepped for scale calls).
     • The arc budget is exact: with n slices combed, ⌈n/2⌉ arcs face one
       way and ⌊n/2⌋ the other, and on the even-only dial each side carries
       exactly half the rim: πr of arc down, πr up.  The "height r, base
       πr" reading is made only alongside the visible bumps and the slider
       that flattens them — the honest informal limit 7.G.B.4 asks for.
     • The calibration stamp needs two facts at once: the wheel's diameter
       makes the ordered track EXACTLY (the order says "a track of 6π";
       only d = 6 lays it), AND the disc's area is declared from the chips
       EXACTLY ((d/2)²·π against foils d²π, πd, 2πd).  Audited over every
       order × every chip × every diameter.
   Verified by audit-pi.mjs (numeric proof + source greps) and
   verify-pi.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/PiLab.jsx
     2. Import and render it:
          import PiLab from './PiLab';
          export default function Page() { return <PiLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (d, roll, n, the
              lesson step, answers, the order, the declared area).
     MODEL  — exact symbolic arithmetic on integer dials; π enters only as
              the symbol/constant, never as a typed decimal.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Three dials that unlock with the lesson: how far
   the wheel has rolled (as a fraction of one turn), the wheel's diameter,
   and the comb's slice count (even, so each side carries half the rim).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // π: the leftover, the count, the formulas
const BLUE = '#3f74a6'; // the wheel and the disc
const GOLD = '#b98718'; // the diameter-stick, ticks, comb slices
const INK_HEX = '#1c2b3a';

const PARAMS = [
  { key: 'roll', label: 'roll the wheel', min: 0, max: 24, step: 1, unlock: 1 }, // 24ths of a turn
  { key: 'd', label: 'diameter d', min: 2, max: 8, step: 1, unlock: 2 },
  { key: 'n', label: 'slices n', min: 6, max: 30, step: 2, unlock: 4 },
];
const START = { roll: 0, d: 4, n: 8 };
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  π enters as the constant only; everything else derived.
   ------------------------------------------------------------------------- */
const circumferenceOf = (d) => d * Math.PI; // C = πd — the model's one law
const areaOf = (d) => (d / 2) * (d / 2) * Math.PI; // A = πr², r = d/2
const trackRatio = (d) => circumferenceOf(d) / d; // ⇒ π, for EVERY d — the claim
const PI_DIGITS = '3.14159'; // how the student sees the count, always with ≈

/* the comb: n even slices, angle 2π/n each; the arc budget splits half down,
   half up — exactly πr of rim on each side */
const sliceAngle = (n) => (2 * Math.PI) / n;
const arcsDown = (n) => n / 2;
const arcsUp = (n) => n / 2;

/* symbolic labels */
const cLabel = (d) => `${d}π`; // C = πd with integer d
const aLabel = (d) => {
  const r = d / 2;
  return Number.isInteger(r * r) ? `${r * r}π` : `${(r * r).toFixed(2)}π`;
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The wheelwright's order."  A track length is
   posted (in π's); build the wheel that lays it, then declare the disc's
   area from the chips — the foils are the classic confusions.
   ------------------------------------------------------------------------- */
/* d = 4 is excluded on purpose: there r² = d = 4, so the truth 4π and the
   circumference foil 4π would collide — the audit proves the survivors'
   chips are pairwise distinct for every order */
const ORDER_DS = [2, 6, 8];
function makeOrder(prevD) {
  let d;
  do {
    d = ORDER_DS[Math.floor(Math.random() * ORDER_DS.length)];
  } while (d === prevD);
  return d;
}
/* the three area chips: the truth and the two habitual wrongs */
function areaChips(d) {
  const r = d / 2;
  return [
    { s: `${r * r}π`, ok: true }, // (d/2)²π — the truth
    { s: `${d * d}π`, ok: false }, // forgot to halve the diameter
    { s: `${d}π`, ok: false }, // the circumference, wearing area's hat
  ];
}
const calibChecks = (order, d, declared) => {
  if (order == null) return [false, false];
  return [d === order, declared != null && declared === `${(order / 2) * (order / 2)}π`];
};
const closeness = (order, d, declared) =>
  Math.round((100 * calibChecks(order, d, declared).filter(Boolean).length) / 2);
const isCalibrated = (order, d, declared) => calibChecks(order, d, declared).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; one dial unlocks per step; the
   reveal lives in the feedback.  The distractors are the real beliefs:
   that the roll is exactly 3 diameters, that π depends on the wheel, that
   22/7 or a two-digit decimal IS π, that combing loses some disc.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The wheel and the stick',
    body:
      'A wheel, with its own diameter painted on it as a gold stick. Today’s only question: ' +
      'when the wheel rolls one full turn, how many of its own sticks long is the track it ' +
      'lays down? Make your guess before anything moves.',
    demo: { roll: 0 },
    q: 'One full roll of any wheel — how many diameter-sticks of track?',
    choices: ['A bit more than 3', 'Exactly 3', 'Exactly 4'],
    answer: 0,
    feedback:
      'A bit more than 3 — and the next step lets you watch it happen. That "bit more" has ' +
      'been measured by every civilization that ever built a wheel, and the astonishing part ' +
      'is not the 3, it is that the leftover is always the SAME bit, for every wheel there is.',
  },
  {
    title: 'Roll it',
    body:
      'The roll dial is live — or drag the wheel itself. Roll one full turn and read the ' +
      'track against the gold sticks: one, two, three… and the carmine leftover.',
    demo: { roll: 0 },
    q: 'The track runs past 3 sticks by a leftover. That leftover is…',
    choices: [
      'Always the same fraction of a stick — about 0.14159 of it',
      'Different for different wheels',
      'Exactly 1/7 of a stick',
    ],
    answer: 0,
    feedback:
      'Always the same: about 0.14159 of a stick, every roll, every wheel. Its full name is ' +
      'π − 3, and π ≈ 3.14159… is the count of diameter-sticks in one roll. Not exactly 1/7 ' +
      'over 3 — 22/7 ≈ 3.14286 is only a handy approximation, and π’s decimals never settle.',
  },
  {
    title: 'Every wheel — π is a ratio',
    body:
      'The diameter dial is live. Make the wheel tiny, make it huge, roll it again: the track ' +
      'grows and shrinks, but COUNTED IN ITS OWN STICKS it never budges.',
    demo: { roll: 24 },
    q: 'A wheel twice as big lays a track that is…',
    choices: [
      'Twice as long — but still exactly π of its own diameter-sticks',
      'More than π of its own sticks — big wheels roll further',
      'π² sticks',
    ],
    answer: 0,
    feedback:
      'Twice the track, same count: π sticks. π is a RATIO — circumference to diameter, C/d — ' +
      'and being a circle fixes it. That is the entire content of the formula C = πd: not a ' +
      'rule to memorize, but a measurement every wheel repeats.',
  },
  {
    title: 'C = πd = 2πr',
    body:
      'One rewrite, for the radius: the diameter is two radii, so the track is C = πd = 2πr. ' +
      'The readout now shows both names.',
    demo: { roll: 24 },
    q: 'Measured in RADIUS-sticks instead, one full roll is…',
    choices: ['2π ≈ 6.28 of them — two radii per diameter', 'π of them', 'πr² of them'],
    answer: 0,
    feedback:
      '2π ≈ 6.28 radius-sticks: each diameter-stick is two radius-sticks, so π diameters is ' +
      '2π radii. (On the special circle whose radius is 1, that 2π IS the whole rim — the ' +
      'Unit Circle bench builds all of trigonometry on exactly that number.)',
  },
  {
    title: 'The comb — cut, move, lose nothing',
    body:
      'Second act. The disc is cut into n equal slices and combed into a row, points up, ' +
      'points down, interlocking. The slices dial is live.',
    demo: { roll: 24, n: 8 },
    comb: true,
    q: 'After combing, the total amount of disc is…',
    choices: [
      'Exactly the same — every slice moved, nothing stretched or trimmed',
      'A little less — the gaps between bumps',
      'A little more — the shape got longer',
    ],
    answer: 0,
    feedback:
      'Exactly the same. Combing is rearrangement: each slice is rotated and slid, never ' +
      'scaled, so the area is conserved to the last crumb. The gaps you think you see are ' +
      'part of the bumpy outline, not missing disc — and the next step flattens them.',
  },
  {
    title: 'The rectangle the circle was hiding',
    body:
      'Slide n up. The bumps flatten, the slanted ends steepen toward vertical, and the comb ' +
      'approaches a rectangle: HEIGHT one radius, BASE half the rim — because half the arcs ' +
      'face down. Read the area off the rectangle.',
    demo: { roll: 24, n: 24 },
    comb: true,
    q: 'The comb’s base is half the rim. So the rectangle reads area = …',
    choices: ['πr × r = πr² — the area formula, derived', '2πr × r = 2πr²', 'πd × d'],
    answer: 0,
    feedback:
      'A = πr². The rim is 2πr; half of it — πr — lies along the bottom, the height is r, and ' +
      'rectangle area is base × height. This is 7.G.B.4’s "informal derivation": the area ' +
      'formula is the circumference formula, combed flat. The finer the slices, the truer the ' +
      'rectangle — and the formula is exact because the amount of disc never changed.',
  },
  {
    title: 'The wheelwright’s order',
    body:
      'An order arrives: a wheel that lays a track of an exact length, and the paperwork ' +
      'wants the disc’s area too. Build the wheel; declare the area.',
    demo: { roll: 24, n: 16 },
    comb: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function PiLab() {
  const [roll, setRoll] = useState(START.roll);
  const [d, setD] = useState(START.d);
  const [n, setN] = useState(START.n);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [order, setOrder] = useState(null);
  const [declared, setDeclared] = useState(null);
  const [chipSet, setChipSet] = useState([]);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const dragRef = useRef(null);

  const current = STEPS[step];
  const calib = !!current.calib;

  const checks = calib ? calibChecks(order, d, declared) : [false, false];
  const pct = calib && order != null ? closeness(order, d, declared) : 0;
  const calibrated = calib && order != null ? isCalibrated(order, d, declared) : false;

  sceneRef.current = { roll, d, n, comb: !!current.comb, calib, order, step };

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

    const bandH = 54;

    /* ---- ACT 1: the rolling wheel (upper region) ---- */
    const rollH = S.comb ? (H - bandH) * 0.46 : H - bandH;
    const groundY = bandH + rollH - 34;
    /* px per unit: the biggest wheel (d=8) rolling π·8 units must fit */
    const worldW = 8 * Math.PI + 10;
    const k = Math.min((W - 60) / worldW, (rollH - 70) / 8.6);
    const x0 = 30;
    const r = (S.d / 2) * k;
    const C = circumferenceOf(S.d) * k; // track px for one turn — C = πd, derived
    const frac = S.roll / 24; // fraction of one turn
    const cxW = x0 + r + C * frac; // wheel centre x
    const cyW = groundY - r;

    /* ground */
    ctx.strokeStyle = 'rgba(28,43,58,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 8, groundY);
    ctx.lineTo(W - 20, groundY);
    ctx.stroke();

    /* the track laid so far — carmine */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + r, groundY);
    ctx.lineTo(x0 + r + C * frac, groundY);
    ctx.stroke();

    /* diameter-stick ticks along one full turn's track — gold */
    const stickPx = S.d * k;
    for (let i = 0; i <= 3; i++) {
      const tx = x0 + r + i * stickPx;
      if (tx > x0 + r + C + 1) break;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - 7);
      ctx.lineTo(tx, groundY + 7);
      ctx.stroke();
      if (i > 0) {
        ctx.fillStyle = GOLD;
        ctx.font = '700 12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(String(i), tx, groundY + 10);
      }
    }
    /* the end of one full turn: the π mark */
    {
      const tx = x0 + r + C;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(tx, groundY - 9);
      ctx.lineTo(tx, groundY + 9);
      ctx.stroke();
      ctx.fillStyle = CARMINE;
      ctx.font = '700 13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('π', tx, groundY + 10);
      /* the leftover beyond 3 sticks, bracketed */
      const t3 = x0 + r + 3 * stickPx;
      if (S.roll === 24 && S.step >= 1) {
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(t3, groundY - 16);
        ctx.lineTo(t3, groundY - 22);
        ctx.lineTo(tx, groundY - 22);
        ctx.lineTo(tx, groundY - 16);
        ctx.stroke();
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('the leftover ≈ 0.14159 sticks', (t3 + tx) / 2, groundY - 25);
      }
    }

    /* the wheel: blue rim, gold diameter stick rotating with the roll */
    const ang = -2 * Math.PI * frac; // rolled angle (rolling right = clockwise)
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cxW, cyW, r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(63,116,166,0.08)';
    ctx.fill();
    /* the painted diameter stick */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cxW - r * Math.cos(ang), cyW - r * Math.sin(ang));
    ctx.lineTo(cxW + r * Math.cos(ang), cyW + r * Math.sin(ang));
    ctx.stroke();
    /* contact point */
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(cxW, groundY, 3.4, 0, 2 * Math.PI);
    ctx.fill();

    /* roll readout above the wheel */
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      S.roll === 24 ? 'one full turn' : S.roll === 0 ? 'ready to roll' : `${S.roll}/24 of a turn`,
      cxW,
      cyW - r - 8
    );

    /* ---- ACT 2: the comb (lower region) ---- */
    if (S.comb) {
      const combTop = bandH + rollH + 10;
      const combH = H - combTop - 14;
      const rC = Math.min(combH / 2.6, ((S.d / 2) * k) * 1.35 + 26);
      const baseY = combTop + combH * 0.72;
      const half = S.n / 2;
      const wSlice = (Math.PI * rC) / half; // base πr split across n/2 down-slices
      const totalW = wSlice * half + wSlice;
      const startX = Math.max(26, (W - totalW) / 2);
      const theta = sliceAngle(S.n); // 2π/n, exact in the model

      const drawSlice = (cx2, cy2, rot, up) => {
        /* a sector of radius rC and angle θ, apex at (cx2, cy2), drawn by
           rotation + translation ONLY — never scaled */
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        const a0 = rot - theta / 2;
        const a1 = rot + theta / 2;
        ctx.arc(cx2, cy2, rC, a0, a1);
        ctx.closePath();
        ctx.fillStyle = up ? 'rgba(185,135,24,0.20)' : 'rgba(63,116,166,0.16)';
        ctx.fill();
        ctx.strokeStyle = up ? GOLD : BLUE;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      };
      /* down-pointing slices: apex on the base line, arc up top */
      for (let i = 0; i < half; i++) {
        const cx2 = startX + wSlice * (i + 0.5) + wSlice / 2;
        drawSlice(cx2, baseY, -Math.PI / 2, false);
      }
      /* up-pointing slices interlocked between them */
      for (let i = 0; i < half; i++) {
        const cx2 = startX + wSlice * (i + 0.5);
        drawSlice(cx2, baseY - rC, Math.PI / 2, true);
      }
      /* the rectangle it approaches */
      ctx.strokeStyle = CARMINE;
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(startX + wSlice / 2, baseY - rC, wSlice * half, rC);
      ctx.setLineDash([]);
      /* labels: height r, base πr */
      ctx.fillStyle = CARMINE;
      ctx.font = '700 12.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('r', startX + wSlice / 2 - 14, baseY - rC / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('πr — half the rim', startX + wSlice / 2 + (wSlice * half) / 2, baseY + 8);
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 11.5px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${S.n} slices — finer is straighter`, W - 22, combTop + 4);
    }

    /* ---- the readout band ---- */
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px ui-monospace, monospace';
    const rInt = S.d / 2;
    const parts =
      S.step >= 5 || S.calib
        ? [
            [`C = ${cLabel(S.d)} ≈ ${(circumferenceOf(S.d)).toFixed(2)}`, CARMINE],
            ['   ·   ', INK_SOFT],
            [`A = ${aLabel(S.d)} ≈ ${areaOf(S.d).toFixed(2)}`, CARMINE],
          ]
        : S.step >= 3
          ? [
              [`C = πd = ${cLabel(S.d)}`, CARMINE],
              ['   ·   ', INK_SOFT],
              [`C = 2πr = 2π·${rInt % 1 === 0 ? rInt : rInt.toFixed(1)}`, CARMINE],
            ]
          : [
              [`track ÷ diameter ≈ ${PI_DIGITS}…`, CARMINE],
              ['   — every wheel', INK_SOFT],
            ];
    const totalW2 = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
    let xPen = W / 2 - totalW2 / 2;
    ctx.textAlign = 'left';
    for (const [s, col] of parts) {
      ctx.fillStyle = col;
      ctx.fillText(s, xPen, bandH / 2);
      xPen += ctx.measureText(s).width;
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
    const dm = STEPS[step].demo;
    if (dm) {
      if (dm.roll != null) setRoll(dm.roll);
      if (dm.n != null) setN(dm.n);
    }
    if (STEPS[step].calib) {
      const o = makeOrder(null);
      setOrder(o);
      setDeclared(null);
      setChipSet(areaChips(o).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: drag the wheel to roll it --------------------------- */
  const onPointerDown = (e) => {
    if (step < 1) return;
    dragRef.current = { startX: e.clientX, startRoll: roll };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const worldW = 8 * Math.PI + 10;
    const rollH = sceneRef.current.comb ? (rect.height - 54) * 0.46 : rect.height - 54;
    const k = Math.min((rect.width - 60) / worldW, (rollH - 70) / 8.6);
    const C = circumferenceOf(d) * k;
    const dRoll = ((e.clientX - dragRef.current.startX) / C) * 24;
    setRoll(Math.max(0, Math.min(24, Math.round(dragRef.current.startRoll + dRoll))));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const setParam = (key, v) => {
    if (key === 'roll') setRoll(v);
    else if (key === 'd') setD(v);
    else setN(v);
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const dm = STEPS[step].demo;
    setRoll(dm && dm.roll != null ? dm.roll : 0);
    if (dm && dm.n != null) setN(dm.n);
    setDeclared(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The wheelwright's order: a track of ${order != null ? `${order}π` : '…'}, and the disc's area. ` +
      `Currently d = ${d}, track ${cLabel(d)}, declared ${declared ?? 'nothing'}. ${calibrated ? 'Calibrated.' : ''}`
    : `Diameter ${d}: rolled ${roll} twenty-fourths of a turn; a full track is ${cLabel(d)}, about ${circumferenceOf(
        d
      ).toFixed(2)}. Track divided by diameter is always about ${PI_DIGITS}.`;

  return (
    <div className="pilab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>π: The Wheel, the Track, the Comb</h1>
        <p className="lede">
          Roll any wheel one full turn and the track is always <em>π of its own diameters</em> —
          π is a ratio, not a button. Then comb the disc into slices:{' '}
          <span className="mono">height r, base πr</span>, and the area formula{' '}
          <span className="mono">A = πr²</span> falls out of the circumference.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div
            className="stage"
            ref={stageRef}
            role="img"
            aria-label={spoken}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="dials">
            {PARAMS.map((p) => {
              const locked = step < p.unlock;
              const value = p.key === 'roll' ? roll : p.key === 'd' ? d : n;
              const show = p.key !== 'n' || !!current.comb || calib;
              if (!show) return null;
              return (
                <div key={p.key} className={'dial' + (locked ? ' locked' : '')}>
                  <div className="dial-head">
                    <span className="dial-k">
                      {p.label} {locked && <span className="lock">🔒</span>}
                    </span>
                    <span className="dial-v mono">
                      {p.key === 'roll' ? (value === 24 ? '1 turn' : `${value}/24`) : value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={value}
                    disabled={locked}
                    onChange={(e) => setParam(p.key, Number(e.target.value))}
                    aria-label={`${p.label}, ${value}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
            {step >= 1 && <span className="hint">or drag the wheel along the ground</span>}
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

          {calib && order != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word mono">a track of exactly {order}π</span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the wheel lays {order}π (set d)
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the disc’s area declared
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Declare the area">
                  {chipSet.map((c2) => (
                    <button
                      type="button"
                      key={c2.s}
                      className={'declbtn mono' + (declared === c2.s ? ' active' : '')}
                      onClick={() => setDeclared(c2.s)}
                    >
                      {c2.s}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? `d = ${order}, r = ${order / 2}: C = ${order}π, A = ${(order / 2) * (order / 2)}π`
                    : checks[0]
                      ? 'wheel built — now halve the diameter before you square'
                      : 'C = πd: which d lays this track?'}
                </span>
              </div>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: pct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">{checks.filter(Boolean).length}/2</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">the wheel · then the area</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const o = makeOrder(order);
                  setOrder(o);
                  setDeclared(null);
                  setChipSet(areaChips(o).sort(() => Math.random() - 0.5));
                }}
              >
                Next order
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
                  setOrder(null);
                  setDeclared(null);
                  setRoll(START.roll);
                  setD(START.d);
                  setN(START.n);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">C = πd = 2πr · A = πr²</span> &nbsp;·&nbsp; π is the ratio every
        circle shares — the track of one roll, counted in diameters; the area formula is the
        circumference, combed flat (CCSS 7.G.B.4). The leftover never settles: π ≈ 3.14159…
      </footer>

      <style jsx>{`
        .pilab {
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
          min-height: 420px;
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
        .dials {
          margin: 12px 4px 0;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 620px) {
          .dials {
            grid-template-columns: 1fr;
          }
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
        }
        .dial.locked {
          opacity: 0.55;
        }
        .dial-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        .dial-k {
          font-size: 12.5px;
          font-weight: 600;
        }
        .lock {
          font-size: 11px;
        }
        .dial-v {
          font-size: 13px;
          color: var(--carmine);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--carmine);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .hint {
          font-size: 12px;
          font-style: italic;
          color: var(--ink-soft);
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
        .quiz {
          margin-top: 4px;
          padding-top: 6px;
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
        .declare {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .declbtn {
          font-size: 13px;
          font-weight: 700;
          padding: 7px 12px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.1);
          color: var(--carmine);
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
        :global(.pilab) :focus-visible {
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
