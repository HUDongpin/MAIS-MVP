'use client';

/* ============================================================================
   UnitCircleLab — an interactive "bench" for THE UNIT CIRCLE: the circle of
   radius exactly 1, the WRAPPING of the number line around its rim, radian
   measure as ARC LENGTH, the coordinates that define cosine and sine, and
   the unrolling that gives birth to the sine wave.

        wrap a string of length t around the rim  →  the point P(t)
        cos t and sin t ARE P(t)'s coordinates    →  unroll: the wave

   Built for MAIS (math AI system, www.mais.ac), K-12.  A HIGH-SCHOOL lab —
   CCSS F-TF.A is the anchor, all four standards:
     • F-TF.A.1  radian measure of an angle as THE LENGTH OF THE ARC on the
                 unit circle subtended by the angle  (the wrap: on a radius-1
                 circle the arc length IS the measure — one radian is one
                 radius laid along the rim)
     • F-TF.A.2  extend the domain: the wrapping takes ANY real number —
                 past 2π the string laps the rim again; negative numbers
                 wrap the other way (co-terminal points, clockwise wraps)
     • F-TF.A.3 (+) special triangles: exact coordinates at π/6, π/4, π/3
                 and their images across the quadrants (√3/2, √2/2, 1/2)
     • F-TF.A.4 (+) symmetry: t and −t land at the same x-coordinate and
                 opposite heights — cosine is even, sine is odd, read
                 straight off the wrap.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated
   on ANSWERED (not correct), and a calibration challenge with a live meter
   and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE WRAPPING, AND THE TWIN RULER."
     A string marked like a number line wraps counterclockwise around the
     rim, starting at (1, 0).  Below the circle lies the SAME string laid
     straight — the twin ruler — and the covered part of both wears the same
     carmine: THE ARC AND THE RULER SEGMENT ARE THE SAME LENGTH.  That
     equality is the entire definition of radian measure: on the circle of
     radius 1 there is no conversion, no formula, no instrument — the number
     t on the ruler IS the arc on the rim.  Six trig labs in this library
     graph circular functions; this lab is the circle they are functions OF.
     The second act UNROLLS the record: as the string wraps, the landing
     point's HEIGHT is copied out to distance t along the straight axis, and
     the sine wave is BORN as a trace — not plotted from a formula, but
     recorded from the rim.  The wave's period is exactly the rim: 2π.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library, and this corner
   is the crossroads of the whole trigonometry wing):
     • AngleLab owns the ANGLE AS A FIGURE and its measure as an amount of
       turn: degrees, the protractor, and radians derived by the RATIO
       s = r·θ on circles of any radius.  This lab never says the word
       "degree", draws no protractor, and never divides an arc by a radius:
       its circle has radius EXACTLY 1, so arc length is not converted into
       the measure — it IS the measure.  (AngleTurnLab keeps fractions of a
       turn in degrees for Grade 4; no fraction-of-turn language here.)
     • CircleLab owns the circle in center-radius form — the equation
       (x−h)²+(y−k)²=r², the h/k/r dials, and the radius triangle with its
       squared legs.  This lab has no equation of a circle, no center or
       radius dial (both are pinned by definition), and NEVER draws the
       radius triangle or squares anything — the Pythagorean identity
       sin²+cos² = 1 is deliberately left unclaimed (a future lab's corner).
     • SineFunctionLab (and its five siblings) own y = A·sin(Bx+C)+D — the
       transformed wave under four dials.  This lab's wave has NO dials, no
       amplitude, no midline, no phase: it is the bare record of the wrap,
       drawn once, owned as a BIRTH rather than a specimen.
     • PointLab owns the ordered pair as an ADDRESS on the coordinate plane.
       Coordinates appear here because cosine and sine ARE coordinates, but
       no address language, no route arrows, no quadrant-map lens.
     • The right-triangle reading of sine (opposite/hypotenuse) is refused
       whole — that is the SOH-CAH-TOA lab's corner (roadmap H16).

   Colour (the SystemsOfEquationsLab three-colour relaxation, documented):
   CARMINE = the WRAP — the covered arc, its twin ruler segment, the landing
   point P, and the number t.  BLUE = cos t (the x-shadow and its readout).
   GOLD = sin t (the y-shadow, its readout, and the born wave — the wave IS
   the sine record).  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The dial position is an INTEGER k with t = k·π/12, so every stated
       fact is exact: the arc length label (k·π/12, reduced by gcd to the
       familiar fractions π/6, 3π/4, …), the special coordinates (an exact
       symbolic table — 0, ±1/2, ±√2/2, ±√3/2, ±1 — cross-checked in the
       audit against the numeric values to 1e-12), quadrant signs, evenness
       and oddness (cos(−t) = cos t, sin(−t) = −sin t as table identities),
       and co-termination (k and k+24 land identically).  Floating point
       touches pixels only.
     • The wave is the wrap's own record: the trace at position u is by
       construction the same sin value the circle shows at u — one model
       serves both panels, so the two cannot disagree.
     • The calibration stamp needs two facts at once: the landing point's
       x-coordinate AND y-coordinate both match the ordered special point —
       and because cosine is even, a wrong-half answer (k ↦ −k) matches x
       while missing y, so the meter's 50% step is itself a lesson.  ANY
       co-terminal wrap stamps (that is F-TF.A.2, honored, not fudged):
       the gate tests k mod 24, audited over every k in the dial range.
   Verified by audit-unitcircle.mjs (numeric proof + source greps) and
   verify-unitcircle.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/UnitCircleLab.jsx
     2. Import and render it:
          import UnitCircleLab from './UnitCircleLab';
          export default function Page() { return <UnitCircleLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (k, the lesson step,
              answers, the order).
     MODEL  — exact integer arithmetic on k (t = k·π/12) plus a symbolic
              value table; it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  ONE dial: the wrapped length t, stored as the
   integer k (t = k·π/12).  Its range GROWS at the domain step: one rim
   first, then any real number the dial can reach.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the wrap: arc, twin ruler segment, P, t
const BLUE = '#3f74a6'; // cos t — the x-shadow
const GOLD = '#b98718'; // sin t — the y-shadow, and the born wave
const INK_HEX = '#1c2b3a';

const K_STEP_UNIT = Math.PI / 12; // one dial click of string
const DIAL_ONE_RIM = { min: 0, max: 24 }; // 0 … 2π
const DIAL_ALL_REALS = { min: -24, max: 48 }; // −2π … 4π (the idea, in reach)
const DOMAIN_STEP = 5; // the step where the dial range grows
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer arithmetic on k; symbolic special values.
   ------------------------------------------------------------------------- */
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const mod24 = (k) => ((k % 24) + 24) % 24;

/* t = k·π/12 as a reduced π-fraction, e.g. k=10 → "5π/6", k=-6 → "−π/2" */
function piFrac(k) {
  if (k === 0) return '0';
  const sign = k < 0 ? '−' : '';
  const a = Math.abs(k);
  const g = gcd(a, 12);
  const num = a / g;
  const den = 12 / g;
  const numS = num === 1 ? 'π' : `${num}π`;
  return sign + (den === 1 ? numS : `${numS}/${den}`);
}

/* the exact value table on the π/12 grid: every k that lands on a multiple
   of π/6 or π/4 has symbolic coordinates drawn from {0, ±1/2, ±√2/2, ±√3/2, ±1}.
   `v` is the numeric twin the audit cross-checks to 1e-12. */
const HALF = { s: '1/2', v: 0.5 };
const R2 = { s: '√2/2', v: Math.SQRT1_2 };
const R3 = { s: '√3/2', v: Math.sqrt(3) / 2 };
const ONE = { s: '1', v: 1 };
const ZERO = { s: '0', v: 0 };
const neg = ({ s, v }) => ({ s: '−' + s, v: -v });
const SPECIALS = {
  0: { cos: ONE, sin: ZERO },
  2: { cos: R3, sin: HALF },
  3: { cos: R2, sin: R2 },
  4: { cos: HALF, sin: R3 },
  6: { cos: ZERO, sin: ONE },
  8: { cos: neg(HALF), sin: R3 },
  9: { cos: neg(R2), sin: R2 },
  10: { cos: neg(R3), sin: HALF },
  12: { cos: neg(ONE), sin: ZERO },
  14: { cos: neg(R3), sin: neg(HALF) },
  15: { cos: neg(R2), sin: neg(R2) },
  16: { cos: neg(HALF), sin: neg(R3) },
  18: { cos: ZERO, sin: neg(ONE) },
  20: { cos: HALF, sin: neg(R3) },
  21: { cos: R2, sin: neg(R2) },
  22: { cos: R3, sin: neg(HALF) },
};
const specialOf = (k) => SPECIALS[mod24(k)] || null;
const cosOf = (k) => Math.cos((k * Math.PI) / 12);
const sinOf = (k) => Math.sin((k * Math.PI) / 12);
/* the readout: exact when the wrap lands on a special, honest ≈ otherwise */
const coordText = (k) => {
  const sp = specialOf(k);
  if (sp) return { cos: sp.cos.s, sin: sp.sin.s, exact: true };
  return { cos: cosOf(k).toFixed(3), sin: sinOf(k).toFixed(3), exact: false };
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The wrapper's order."  An exact landing point is
   posted; wrap any length that lands there.  Co-terminal answers stamp —
   that is F-TF.A.2 honored, not fudged.
   ------------------------------------------------------------------------- */
const ORDER_POOL = [2, 3, 4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22];
function makeOrder(prevK) {
  let k;
  do {
    k = ORDER_POOL[Math.floor(Math.random() * ORDER_POOL.length)];
  } while (k === prevK);
  return k;
}
const calibChecks = (k, targetK) => {
  if (targetK == null) return [false, false];
  const sp = specialOf(k);
  const tg = SPECIALS[targetK];
  if (!sp) return [false, false];
  return [sp.cos.s === tg.cos.s, sp.sin.s === tg.sin.s];
};
const closeness = (k, targetK) => Math.round((100 * calibChecks(k, targetK).filter(Boolean).length) / 2);
const isCalibrated = (k, targetK) => calibChecks(k, targetK).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the dial's range and the lenses
   unlock with the steps; the reveal lives in the feedback.  The distractors
   are the real beliefs: that 360 is a length, that the wave needs a
   formula, that going past 2π breaks something.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The circle of radius one',
    body:
      'One circle, radius exactly 1 — one radius long, no unit attached. Under it lies a ' +
      'string marked like a number line, in radius-lengths. Everything this lab does is done ' +
      'by wrapping that string around this rim.',
    demo: 0,
    lockDial: true,
    q: 'The rim of this circle, all the way around, is how long?',
    choices: ['2π radius-lengths — about 6.28', '360 of something', 'π radius-lengths'],
    answer: 0,
    feedback:
      'C = 2πr, and r = 1, so the rim is exactly 2π ≈ 6.28 radius-lengths. That number is the ' +
      'whole reason this circle is special: on a radius-1 circle, lengths along the rim need ' +
      'no conversion — and 360 is not a length at all, just an old habit this lab never needs.',
  },
  {
    title: 'The wrap — arc length IS the measure',
    body:
      'The dial is live: wrap t of string counterclockwise from (1, 0). The covered arc and ' +
      'the covered ruler wear the same carmine because they are THE SAME LENGTH. That is what ' +
      'a radian is: one radius, laid along the rim.',
    demo: 6,
    q: 'Wrap t = π/2 — a quarter of the rim. How long is the arc you covered?',
    choices: [
      'Exactly π/2 — the arc IS the number on the ruler',
      'It depends on the size of the circle',
      '90',
    ],
    answer: 0,
    feedback:
      'Exactly π/2. On the unit circle there is nothing to convert: the length you wrapped is ' +
      'the measure of the turn you made. (On a bigger circle you would have to divide out the ' +
      'radius — the Angle bench tells that story; here the radius is 1 and the arc speaks for ' +
      'itself.)',
  },
  {
    title: 'The landing point — cosine and sine are born',
    body:
      'Wherever the string stops, a point P lands on the rim. Drop its two shadows: the blue ' +
      'one onto the x-axis, the gold one onto the y-axis. Those two shadows are the DEFINITION: ' +
      'cos t is P’s x-coordinate, sin t is P’s y-coordinate.',
    demo: 6,
    shadows: true,
    q: 'Wrap t = π — half the rim. Where does P land?',
    choices: ['(−1, 0) — so cos π = −1 and sin π = 0', '(0, −1)', '(π, 0)'],
    answer: 0,
    feedback:
      'Half the rim ends at the far left: P = (−1, 0), so cos π = −1 and sin π = 0. Notice ' +
      'what just happened: cosine and sine are not triangle ratios or calculator buttons here — ' +
      'they are COORDINATES of a landing point, defined for any length of string you care to ' +
      'wrap.',
  },
  {
    title: 'The special landings',
    body:
      'Some wraps land on points whose coordinates are EXACT: halves, √2/2, √3/2 — the chips ' +
      'snap the string to them. Tour the first quarter: π/6, π/4, π/3, and watch the pair ' +
      '(cos, sin) trade values.',
    demo: 2,
    shadows: true,
    chips: [2, 3, 4, 6],
    q: 'sin(π/6) = ?',
    choices: ['1/2 — exactly, not approximately', '0.4999999999', '√3/2'],
    answer: 0,
    feedback:
      'Exactly 1/2. At t = π/6 the landing point is (√3/2, 1/2) — heights and shadows straight ' +
      'from the equilateral and right isosceles triangles, exact forever. And π/3 lands at ' +
      '(1/2, √3/2): the same two numbers, swapped — the first quarter of the rim is a little ' +
      'dance of three values.',
  },
  {
    title: 'The unroll — a wave is born',
    body:
      'Now the record player: as the string wraps, P’s HEIGHT is copied out to distance t ' +
      'along the straight axis on the right. Sweep the dial slowly from 0 to 2π and watch ' +
      'what the rim writes.',
    demo: 9,
    shadows: true,
    wave: true,
    q: 'After t = 0, the recorded height first returns to 0 at t = …',
    choices: ['π — half the rim, at the far-left landing (−1, 0)', '2π', 'π/2'],
    answer: 0,
    feedback:
      'At t = π: the landing point crosses the x-axis at (−1, 0), so its height — sin t — is 0 ' +
      'again. The full picture is the sine wave, and its period is exactly the rim: 2π. The ' +
      'wave benches dress this curve up with dials; here you watched it be BORN, from nothing ' +
      'but a wrap and a shadow.',
  },
  {
    title: 'Any real number — and the mirror wrap',
    body:
      'The dial now runs past 2π and below 0. Wrap 2π + π/2 — one full lap, then a quarter ' +
      'more. Wrap −π/2 — the string runs CLOCKWISE. The wrapping accepts every real number; ' +
      'that is what lets sine and cosine be functions on the whole line.',
    demo: 30,
    shadows: true,
    wave: true,
    allReals: true,
    q: 'How does P(t + 2π) compare with P(t)?',
    choices: [
      'Same point — the string just laps the rim one extra time',
      'Slightly further around',
      'Reflected upside down',
    ],
    answer: 0,
    feedback:
      'The same point, exactly: 2π of string is one full rim, so the landing repeats — which ' +
      'is WHY the wave repeats with period 2π. And compare t with −t: same x-coordinate, ' +
      'opposite heights. cos(−t) = cos t, sin(−t) = −sin t: cosine is even, sine is odd, read ' +
      'straight off the two wraps.',
  },
  {
    title: 'The wrapper’s order',
    body:
      'An exact landing point is posted. Wrap ANY length that lands there — a first-lap wrap, ' +
      'an extra lap, even a clockwise wrap: if the string lands on the point, it counts.',
    demo: 0,
    shadows: true,
    wave: true,
    allReals: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function UnitCircleLab() {
  const [k, setK] = useState(6);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [targetK, setTargetK] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const dragRef = useRef(false);

  const current = STEPS[step];
  const calib = !!current.calib;
  const dial = current.allReals ? DIAL_ALL_REALS : DIAL_ONE_RIM;

  const checks = calib ? calibChecks(k, targetK) : [false, false];
  const pct = calib && targetK != null ? closeness(k, targetK) : 0;
  const calibrated = calib && targetK != null ? isCalibrated(k, targetK) : false;

  const coords = coordText(k);

  sceneRef.current = {
    k,
    shadows: !!current.shadows || calib,
    wave: !!current.wave,
    calib,
    targetK,
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
    const t = (S.k * Math.PI) / 12;

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
    const rulerH = 64;
    const plotH = H - bandH - rulerH;

    /* layout: circle panel (left, square) + wave panel (right) */
    const waveOn = S.wave;
    const cirW = waveOn ? Math.min(plotH, W * 0.44) : Math.min(plotH, W * 0.72);
    const R = cirW / 2 - 34;
    const cx = (waveOn ? W * 0.24 : W * 0.5) | 0;
    const cy = bandH + plotH / 2;

    const px = (X, Y) => [cx + X * R, cy - Y * R];

    /* axes through the circle's centre (coordinates are the subject here) */
    ctx.strokeStyle = 'rgba(91,107,123,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - R - 22, cy);
    ctx.lineTo(cx + R + 22, cy);
    ctx.moveTo(cx, cy - R - 22);
    ctx.lineTo(cx, cy + R + 22);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = 'italic 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('x', cx + R + 8, cy + 4);
    ctx.fillText('y', cx + 6, cy - R - 18);

    /* the rim */
    ctx.strokeStyle = 'rgba(28,43,58,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    /* the start of the wrap */
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx + R, cy, 3.2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('(1, 0)', cx + R + 6, cy - 6);
    /* a one-radius stick, for scale: the unit itself */
    ctx.strokeStyle = 'rgba(28,43,58,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R, cy);
    ctx.stroke();

    /* the covered arc — carmine, wrapping CCW from (1,0); laps ghosted */
    const laps = Math.floor(Math.abs(t) / (2 * Math.PI));
    if (laps > 0) {
      ctx.strokeStyle = 'rgba(200,30,79,0.25)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.stroke();
    }
    const frac = t % (2 * Math.PI);
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    if (frac >= 0) ctx.arc(cx, cy, R, 0, -frac, true);
    else ctx.arc(cx, cy, R, 0, -frac, false);
    ctx.stroke();

    /* the landing point and its shadows */
    const [pxx, pxy] = px(cosOf(S.k), sinOf(S.k));
    if (S.shadows) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pxx, pxy);
      ctx.lineTo(pxx, cy);
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(pxx, pxy);
      ctx.lineTo(cx, pxy);
      ctx.stroke();
      ctx.setLineDash([]);
      /* the two shadow feet */
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(pxx, cy, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(cx, pxy, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(pxx, pxy, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* target marker (capstone): the posted landing point */
    if (S.calib && S.targetK != null) {
      const [txx, txy] = px(cosOf(S.targetK), sinOf(S.targetK));
      ctx.strokeStyle = '#1f8a5b';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(txx, txy, 12, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ---- the twin ruler — the same string, laid straight ---- */
    const rulY = H - rulerH + 26;
    const rulX0 = 24;
    const rulX1 = W - 24;
    const kMin = S.calib || S.k < 0 ? -24 : 0;
    const kMax = S.calib || S.k > 24 ? 48 : 24;
    const kToX = (kk) => rulX0 + ((kk - kMin) / (kMax - kMin)) * (rulX1 - rulX0);
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(rulX0, rulY);
    ctx.lineTo(rulX1, rulY);
    ctx.stroke();
    ctx.font = '600 10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let kk = kMin; kk <= kMax; kk += 6) {
      const x = kToX(kk);
      ctx.strokeStyle = 'rgba(28,43,58,0.6)';
      ctx.beginPath();
      ctx.moveTo(x, rulY - 5);
      ctx.lineTo(x, rulY + 5);
      ctx.stroke();
      ctx.fillStyle = kk === 0 ? INK_HEX : INK_SOFT;
      ctx.fillText(piFrac(kk), x, rulY + 9);
    }
    /* the covered part of the ruler — same carmine, same length as the arc */
    ctx.strokeStyle = CARMINE;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(kToX(0), rulY);
    ctx.lineTo(kToX(S.k), rulY);
    ctx.stroke();
    ctx.fillStyle = CARMINE;
    ctx.beginPath();
    ctx.arc(kToX(S.k), rulY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = 'italic 600 11.5px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('the same string, laid straight — arc and ruler match', rulX0, rulY + 24);

    /* ---- the wave panel: the unrolled record of the height ---- */
    if (waveOn) {
      const wx0 = cx + R + 44;
      const wx1 = W - 26;
      const wy = cy;
      const wAmp = Math.min(R, plotH / 2 - 24);
      const kLo = S.calib || S.k < 0 ? -24 : 0;
      const kHi = 48;
      const kToWx = (kk) => wx0 + ((kk - kLo) / (kHi - kLo)) * (wx1 - wx0);
      /* axis */
      ctx.strokeStyle = 'rgba(91,107,123,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wx0 - 6, wy);
      ctx.lineTo(wx1, wy);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let kk = Math.max(kLo, -24); kk <= 48; kk += 12) {
        const x = kToWx(kk);
        ctx.beginPath();
        ctx.moveTo(x, wy - 4);
        ctx.lineTo(x, wy + 4);
        ctx.stroke();
        ctx.fillText(piFrac(kk), x, wy + 8);
      }
      /* the trace: from 0 out to the current wrap — the record so far */
      const from = Math.min(0, S.k);
      const to = Math.max(0, S.k);
      if (to > from) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const steps = Math.max(2, (to - from) * 6);
        for (let i = 0; i <= steps; i++) {
          const kk = from + ((to - from) * i) / steps;
          const x = kToWx(kk);
          const y = wy - Math.sin((kk * Math.PI) / 12) * wAmp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* the copy line: P's height carried across to the record's tip */
      const tipX = kToWx(S.k);
      const tipY = wy - sinOf(S.k) * wAmp;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(185,135,24,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pxx, pxy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('the record: height sin t, filed at distance t', wx0, bandH + 14);
    }

    /* ---- the readout band ---- */
    ctx.textBaseline = 'middle';
    ctx.font = '700 16px ui-monospace, monospace';
    const c = coordText(S.k);
    const parts = [
      [`t = ${piFrac(S.k)}`, CARMINE],
      ['   ·   ', INK_SOFT],
      [`cos t = ${c.cos}`, BLUE],
      ['   ', INK_SOFT],
      [`sin t = ${c.sin}`, GOLD],
      [c.exact ? '   (exact)' : '   (≈)', INK_SOFT],
    ];
    const totalW = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
    let xPen = W / 2 - totalW / 2;
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
    setK(STEPS[step].demo);
    if (STEPS[step].calib) setTargetK(makeOrder(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: dial, chips, and dragging P around the rim ---------- */
  const onPointerDown = (e) => {
    if (current.lockDial) return;
    dragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragTo(e);
  };
  const dragTo = (e) => {
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const bandH = 54;
    const rulerH = 64;
    const plotH = rect.height - bandH - rulerH;
    const waveOn = !!sceneRef.current.wave;
    const cirW = waveOn ? Math.min(plotH, rect.width * 0.44) : Math.min(plotH, rect.width * 0.72);
    const R = cirW / 2 - 34;
    const cx = (waveOn ? rect.width * 0.24 : rect.width * 0.5) | 0;
    const cy = bandH + plotH / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = -(e.clientY - rect.top - cy);
    if (dx * dx + dy * dy < R * 0.3 * (R * 0.3)) return; // too near the centre to aim
    let a = Math.atan2(dy, dx);
    if (a < 0) a += 2 * Math.PI; // one-rim angle 0..2π
    const kk = Math.round(a / K_STEP_UNIT);
    /* keep the wrap's lap count: move within the current lap */
    const lap = Math.floor(k / 24) * 24;
    let cand = lap + (kk % 24);
    for (const c of [cand - 24, cand, cand + 24]) {
      if (Math.abs(c - k) <= 12 && c >= dial.min && c <= dial.max) {
        cand = c;
        break;
      }
    }
    setK(Math.max(dial.min, Math.min(dial.max, cand)));
  };
  const onPointerMove = (e) => {
    if (dragRef.current) dragTo(e);
  };
  const onPointerUp = () => {
    dragRef.current = false;
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => setK(STEPS[step].demo);

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const tg = targetK != null ? SPECIALS[targetK] : null;
  const spoken = calib
    ? `The wrapper's order: land on (${tg ? tg.cos.s : '…'}, ${tg ? tg.sin.s : '…'}). Currently t = ${piFrac(
        k
      )}, landing at (${coords.cos}, ${coords.sin}). ${calibrated ? 'Calibrated.' : ''}`
    : `t = ${piFrac(k)}: the string covers an arc of length ${piFrac(k)}; the landing point is (${coords.cos}, ${
        coords.sin
      })${coords.exact ? ', exactly' : ', approximately'}.`;

  return (
    <div className="uclab">
      <header className="head">
        <h1>The Unit Circle: Wrap, Land, Unroll</h1>
        <p className="lede">
          Wrap a string of length <em>t</em> around a circle of radius 1 — the arc it covers{' '}
          <em>is</em> the measure (that is a radian). The landing point’s coordinates{' '}
          <em>are</em> <span className="mono">cos t</span> and <span className="mono">sin t</span>
          , and unrolling the record gives birth to the sine wave.
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
            <div className={'dial' + (current.lockDial ? ' locked' : '')}>
              <div className="dial-head">
                <span className="dial-k">
                  wrapped length t {current.lockDial && <span className="lock">🔒</span>}
                </span>
                <span className="dial-v mono">{piFrac(k)}</span>
              </div>
              <input
                type="range"
                min={dial.min}
                max={dial.max}
                step={1}
                value={k}
                disabled={!!current.lockDial}
                onChange={(e) => setK(Number(e.target.value))}
                aria-label={`Wrapped length t, ${piFrac(k)}`}
              />
            </div>
          </div>

          <div className="toolbar" role="group" aria-label="Special wraps">
            {current.chips &&
              current.chips.map((kk) => (
                <button
                  type="button"
                  key={kk}
                  className={'chipbtn' + (k === kk ? ' active' : '')}
                  onClick={() => setK(kk)}
                >
                  t = {piFrac(kk)}
                </button>
              ))}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
            {!current.lockDial && <span className="hint">or drag the landing point around the rim</span>}
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

          {calib && targetK != null && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The order</span>
                <span className="target-word mono">
                  land on ({SPECIALS[targetK].cos.s}, {SPECIALS[targetK].sin.s})
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the x-coordinate matches (cos t)
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the y-coordinate matches (sin t)
                  </li>
                </ol>
                <span className="target-hint mono">
                  {calibrated
                    ? `landed — t = ${piFrac(k)} works, and so does every extra lap`
                    : checks[0]
                      ? 'right x — wrong half of the rim (cosine is even…)'
                      : 'read the signs: which quarter of the rim?'}
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
                  <span className="mono target-hint">x · then y</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTargetK(makeOrder(targetK));
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
                  setTargetK(null);
                  setK(6);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">wrap · land · unroll</span> &nbsp;·&nbsp; radian measure is arc
        length on the unit circle; cos t and sin t are the landing point’s coordinates; the
        wrapping accepts every real number, and the unrolled record is the sine wave
        (CCSS F-TF.A.1–4). The rim is 2π — and so, therefore, is the period.
      </footer>

      <style jsx>{`
        .uclab {
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
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .hint {
          font-size: 12px;
          font-style: italic;
          color: var(--ink-soft);
        }
        .chipbtn {
          font: 600 12.5px/1.2 ui-monospace, monospace;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--carmine);
          background: rgba(200, 30, 79, 0.08);
          color: var(--carmine);
        }
        .chipbtn:hover {
          border-color: var(--ink);
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
        :global(.uclab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (max-width: 460px) {
          .toolbar {
            gap: 6px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .chipbtn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
