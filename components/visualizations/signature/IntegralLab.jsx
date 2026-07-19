'use client';

/* ============================================================================
   IntegralLab — an interactive "bench" for the INTEGRAL and the FUNDAMENTAL
   THEOREM OF CALCULUS: rectangles corner the area under a curve, and the
   accumulated area turns out to grow at exactly the curve's own height.

        under-count  ≤  area  ≤  over-count      (every brigade size n)
        the integral = the ONE number inside every trap
        A(x) = area banked from 0 to x   ⇒   A′ = f      (the FTC)

   Built for MAIS (math AI system, www.mais.ac), K-12.  AP CALCULUS — the
   counterpart DerivativeLab has been missing: that bench turned curves into
   rates; this bench banks area and discovers the rate of the bank balance
   is the original curve.  LimitLab built the floor (what "closing in on one
   number" means); this bench stands on it without redrawing it.

   THE SIGNATURE CENTERPIECE — "THE TWO BRIGADES, AND THE AREA ODOMETER."
     Two gold brigades of n slats stand under the road f(t): the under-
     brigade reads each slat's height at its LEFT edge, the over-brigade at
     its RIGHT.  For these climbing roads the true area is TRAPPED between
     their counts, the trap's width is EXACTLY (f(x) − f(0))·x/n, and the
     dial that narrows the slats closes the trap on a single surviving
     number — the integral, defined the honest way.  Then the instrument
     changes: sweep the region's right edge and the AREA ODOMETER plots the
     running total A(x) on its own panel above the road.  The odometer under
     a flat road draws 2x; under the ramp it draws x²/2 — and its ticking
     rate over the last quarter-step is trapped between two nearby road
     heights, forcing A′ = f: the Fundamental Theorem, seen before it is
     named.  The capstone is the auditor's stamp: a road and a stop are
     posted; rule the exact banked area AND the odometer's formula.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DerivativeLab owns the secant-becoming-tangent and its h-dial; no
       secant or tangent line is drawn here and nothing pivots.  The FTC is
       stated as a fact about the odometer's growth, and the derivative
       bench is cited by name as the road run the other way.
     • LimitLab owns the two walkers and their exact footholds; no walker
       walks here.  "Closing in" is carried by nested TRAPS of under/over
       counts — intervals, not journeys.
     • AreaLab (3-5) owns cut-and-slide rearrangement; nothing here is cut,
       slid, or rearranged — the region is cornered by testimony from two
       sides, never dissected.
     • PiLab owns the sector comb (curved region re-laid as a rectangle);
       no sector appears.  SeriesLab owns the accumulation waterfall of
       term-bars and its partial sums; the odometer accumulates a CONTINUOUS
       sweep, draws a curve, and no term-by-term bars exist.
     • HistogramLab owns data bars over bins; these slats partition an
       interval under a function, carry no data, and the word "bin" is
       refused outright.  NormalDistributionLab owns area-as-probability;
       area here is geometric fact, and nothing is a chance.
     • LineFunctionLab owns the slope triangle; none is drawn.

   One-accent discipline: CARMINE is THE INTEGRAL — the trap's surviving
   number, the odometer curve, the verdicts.  BLUE is the road f (quiet).
   GOLD is the SLATS and the sweep tooling.  GREEN only for correct/CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every road is a polynomial with exact rational coefficients (2, t,
       t²/4), every stop is a quarter-integer, and every displayed number is
       an EXACT reduced fraction — integer arithmetic throughout; no float a
       student can see.  Floats touch pixels only.
     • The brigade counts are closed-form exact:
         L = c0·x + c1·x²(n−1)/(2n) + c2·x³(n−1)(2n−1)/(6n²)
         R = c0·x + c1·x²(n+1)/(2n) + c2·x³(n+1)(2n+1)/(6n²)
       and the audit re-derives BOTH by literal slat-by-slat summation, then
       proves L ≤ A ≤ R at every dial stop, the exact gap law
       R − L = (f(x) − f(0))·x/n, and the refinement L(n) ≤ L(2n), R(2n) ≤ R(n).
     • The odometer is the exact antiderivative A(x) = c0x + c1x²/2 + c2x³/3;
       the audit confirms every quoted stop (1/2, 2, 9/2, 8; 16/3) and the
       FTC trap  f(x − 1/4) ≤ (A(x) − A(x − 1/4))·4 ≤ f(x)  at every quarter.
     • The auditor's stamp needs two exact rulings at once — the area from
       0 to b AND the odometer's formula — audited over every posted case ×
       every chip pair; the truth chip is always present and never duplicated.
   Verified by audit-integral.mjs (numeric proof + source greps) and
   verify-integral.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/IntegralLab.jsx
     2. Import and render it:
          import IntegralLab from './IntegralLab';
          export default function Page() { return <IntegralLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the road, the slat
              count, the sweep, the lesson step, answers, the rulings).
     MODEL  — exact fraction arithmetic on polynomial roads; no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Roads by chip; the brigade size and the sweep by dial.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the integral: trap survivor, odometer, verdicts
const BLUE = '#3f74a6'; // the road f
const GOLD = '#b98718'; // the slats and the sweep
const INK_HEX = '#1c2b3a';

const SLATS = [4, 8, 16, 32, 64]; // the brigade dial's stops
const QMAX = 16; // the sweep: x = 0 … 4 in exact quarters
const CALIB_STEP = 5;
const B_CHOICES = [2, 3, 4]; // posted stops for the auditor

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact fractions; polynomial roads f(t) = c0 + c1·t + c2·t².
   ------------------------------------------------------------------------- */
const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
const frac = (n, d = 1) => {
  const s = d < 0 ? -1 : 1;
  const g = gcdInt(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
const fAdd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fSub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fMul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fLe = (a, b) => a.n * b.d <= b.n * a.d;
const fEq = (a, b) => a.n === b.n && a.d === b.d;
const fracText = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const fVal = (f) => f.n / f.d; /* pixels only — never displayed */

const PRESETS = {
  flat: {
    label: 'the flat road',
    c: [frac(2), frac(0), frac(0)],
    fStr: 'f(t) = 2',
    FStr: 'A(x) = 2x',
    story: 'f(t) = 2 — the same height everywhere',
  },
  ramp: {
    label: 'the ramp',
    c: [frac(0), frac(1), frac(0)],
    fStr: 'f(t) = t',
    FStr: 'A(x) = x²/2',
    story: 'f(t) = t — the road climbs steadily',
  },
  bend: {
    label: 'the bend',
    c: [frac(0), frac(0), frac(1, 4)],
    fStr: 'f(t) = t²/4',
    FStr: 'A(x) = x³/12',
    story: 'f(t) = t²/4 — the climb keeps steepening',
  },
};
const presetIds = Object.keys(PRESETS);

/* the road's exact height at a fraction t */
const fAt = (P, x) => fAdd(P.c[0], fAdd(fMul(P.c[1], x), fMul(P.c[2], fMul(x, x))));
/* the odometer: the exact antiderivative A(x) = c0·x + c1·x²/2 + c2·x³/3 */
const trueA = (P, x) =>
  fAdd(
    fMul(P.c[0], x),
    fAdd(
      fMul(fMul(P.c[1], frac(1, 2)), fMul(x, x)),
      fMul(fMul(P.c[2], frac(1, 3)), fMul(fMul(x, x), x))
    )
  );
/* the brigades, closed form (the audit re-derives both slat by slat) */
const leftSum = (P, n, x) =>
  fAdd(
    fMul(P.c[0], x),
    fAdd(
      fMul(fMul(P.c[1], frac(n - 1, 2 * n)), fMul(x, x)),
      fMul(fMul(P.c[2], frac((n - 1) * (2 * n - 1), 6 * n * n)), fMul(fMul(x, x), x))
    )
  );
const rightSum = (P, n, x) =>
  fAdd(
    fMul(P.c[0], x),
    fAdd(
      fMul(fMul(P.c[1], frac(n + 1, 2 * n)), fMul(x, x)),
      fMul(fMul(P.c[2], frac((n + 1) * (2 * n + 1), 6 * n * n)), fMul(fMul(x, x), x))
    )
  );
const gapOf = (P, n, x) => fSub(rightSum(P, n, x), leftSum(P, n, x));
/* quarter-integer display without floats: p quarters → "3.25" style text */
const xText = (p) => `${Math.trunc(p / 4)}${['', '.25', '.5', '.75'][p % 4]}`;

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The auditor's stamp."  A road and a stop b are
   posted; rule the exact banked area AND the odometer's formula.
   ------------------------------------------------------------------------- */
function makeCase(prev) {
  let k;
  do {
    k = {
      presetId: presetIds[Math.floor(Math.random() * presetIds.length)],
      b: B_CHOICES[Math.floor(Math.random() * B_CHOICES.length)],
    };
  } while (prev && k.presetId === prev.presetId && k.b === prev.b);
  return k;
}
const areaTruth = (k) => trueA(PRESETS[k.presetId], frac(k.b));
const areaChips = (k) => {
  const P = PRESETS[k.presetId];
  const b = frac(k.b);
  const truth = trueA(P, b);
  /* distractors: the full-rectangle reading f(b)·b, the other roads' truths,
     double and half — deduped, first four, sorted ascending (exactly) */
  const cands = [
    truth,
    fMul(fAt(P, b), b),
    trueA(PRESETS.flat, b),
    trueA(PRESETS.ramp, b),
    trueA(PRESETS.bend, b),
    fMul(truth, frac(2)),
    fMul(truth, frac(1, 2)),
  ];
  const seen = new Set();
  const out = [];
  for (const c of cands) {
    const t = fracText(c);
    if (!seen.has(t)) {
      seen.add(t);
      out.push(c);
    }
    if (out.length === 4) break;
  }
  return out.sort((a, b2) => a.n * b2.d - b2.n * a.d).map(fracText);
};
const FORMULA_CHIPS = ['A(x) = 2x', 'A(x) = x²/2', 'A(x) = x³/12', 'A(x) = x·f(x)'];
const formulaTruth = (k) => PRESETS[k.presetId].FStr;
const calibChecks = (k, areaPick, formulaPick) => {
  if (!k) return [false, false];
  const areaOK = areaPick != null && areaPick === fracText(areaTruth(k));
  const formulaOK = areaOK && formulaPick != null && formulaPick === formulaTruth(k);
  return [areaOK, formulaOK];
};
const closeness = (k, a, f) =>
  Math.round((100 * calibChecks(k, a, f).filter(Boolean).length) / 2);
const isCalibrated = (k, a, f) => calibChecks(k, a, f).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the reveal lives in the feedback.
   The distractors are the real beliefs: that rectangles are always exact,
   that more slats widen the doubt, that area under a line grows linearly.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The flat road',
    body:
      'Area under a road, measured with rectangles: n gold slats stand under the road, each ' +
      'read at its left edge for the under-count and its right edge for the over-count. Work ' +
      'the dial. On a flat road the two counts agree at every n.',
    preset: 'flat',
    slats: true,
    q: 'Why do the two counts agree here, exactly?',
    choices: [
      'Each slat has a flat top, and so does the road — no slat over- or under-shoots anywhere',
      'Rectangles measure every region exactly, flat or not',
      'They only agree because n is even',
    ],
    answer: 0,
    feedback:
      'A slat can only be honest about a flat road: under = over = 2x for every brigade ' +
      'size, and area needs no new idea. The moment the road climbs, each slat must pick ' +
      'one height and starts lying a little. The rest of this bench corners the truth ' +
      'anyway. Watch the ledger while you dial: every row repeats the same total — the ' +
      'quiet baseline the next steps will break.',
  },
  {
    title: 'Two brigades, one trap',
    body:
      'The ramp climbs, so every slat is too short read at its left edge and too tall read ' +
      'at its right. At n = 4 the under-brigade counts 6, the over-brigade 10 — the true ' +
      'area is trapped between them.',
    preset: 'ramp',
    slats: true,
    q: 'Double the brigade to n = 8. The trap becomes…',
    choices: [
      '[7, 9] — doubling the slats halves the gap',
      '[6, 10] — the trap never moves',
      '[5, 11] — more slats, wider trap',
    ],
    answer: 0,
    feedback:
      'The ledger reads 7 and 9. The gap is exactly 16/n: each slat’s overshoot slides ' +
      'into one column 4/n wide and 4 tall. So the trap halves at every doubling — 4, 2, ' +
      '1, 1/2 — closing on a single number. Notice what the dial buys: effort narrows ' +
      'doubt at a known exchange rate, and nothing about the road had to be simple.',
  },
  {
    title: 'One number survives',
    body:
      'The bend, f(t) = t²/4. At n = 4 the ledger says 7/2 and 15/2. Narrow the slats: the ' +
      'counts creep together and never quite meet. Watch which value stays inside every trap.',
    preset: 'bend',
    slats: true,
    q: 'So what IS the exact area under a curved road?',
    choices: [
      'The one number inside every trap — cornered from both sides; that number is the integral',
      'The over-count at n = 64, which is close enough',
      'Curved regions have no exact area',
    ],
    answer: 0,
    feedback:
      'That survivor is the integral, written ∫. Every trap here holds 16/3, and the traps ' +
      'shrink below any doubt you name — so the area is exactly 16/3, no rounding. The ' +
      'region was cornered by testimony from two sides, never cut up or rearranged. This ' +
      'is the only definition of area a curved boundary will ever grant, and it is enough.',
  },
  {
    title: 'The area odometer',
    body:
      'New instrument. Sweep the region’s right edge x and bank area as you go: the running ' +
      'total A(x) is plotted upstairs while you sweep. On the flat road the odometer draws ' +
      'a straight line, 2x. Read what it draws for the ramp.',
    preset: 'ramp',
    sweep: true,
    odometer: true,
    chips: true,
    q: 'Under the steady ramp, banked area grows like…',
    choices: [
      'x²/2 — a curve: the later the stretch, the taller the road, the faster area piles up',
      'x — a straight road should bank area at a straight rate',
      'It climbs in sudden jumps at whole numbers',
    ],
    answer: 0,
    feedback:
      'A(x) = x²/2 — a parabola, from a straight road. Check the stops: A(1) = 1/2, ' +
      'A(2) = 2, A(3) = 9/2, A(4) = 8, each the triangle’s half-base-times-height. Banked ' +
      'area is a new FUNCTION of where you stop, one degree steeper than the road it came ' +
      'from. Sweep slowly near zero and again near the far end to feel the difference the ' +
      'road’s height makes to the odometer’s pace.',
  },
  {
    title: 'The odometer’s speed',
    body:
      'How fast is the odometer turning at x? Over the last quarter-step it gained ' +
      'A(x) − A(x − 1/4). The gain per unit width sits trapped between the road’s heights ' +
      'at the step’s two ends — read the panel while you sweep.',
    preset: 'bend',
    sweep: true,
    odometer: true,
    speed: true,
    chips: true,
    q: 'Shrink the step. The odometer’s speed at x becomes…',
    choices: [
      'f(x) — banked area grows at exactly the road’s height: the Fundamental Theorem of Calculus',
      'A(x) — the banked area sets its own speed',
      'n — the speed is the slat count',
    ],
    answer: 0,
    feedback:
      'A′ = f: the rate of the accumulation IS the curve being accumulated. That is the ' +
      'Fundamental Theorem — banking and rate-of-change are inverse gestures (the derivative ' +
      'bench ran this road the other way). And it is the shortcut: name any F whose rate is ' +
      'f, and the trap’s answer is simply F(b) − F(a). Check it against the panel: the trap ' +
      'around the rate tightens exactly as the road flattens under a shorter step.',
  },
  {
    title: 'The auditor’s stamp',
    body:
      'An account is posted: a road, and a stop x = b. Rule the exact area banked from 0 ' +
      'to b, then rule which formula the odometer was writing. Both rulings exact, or no stamp.',
    preset: 'ramp',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function IntegralLab() {
  const [presetId, setPresetId] = useState('flat');
  const [slatIdx, setSlatIdx] = useState(0);
  const [sweepP, setSweepP] = useState(QMAX);
  const [areaPick, setAreaPick] = useState(null);
  const [formulaPick, setFormulaPick] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const activeId = calib && kase ? kase.presetId : presetId;
  const P = PRESETS[activeId];

  const checks = calib ? calibChecks(kase, areaPick, formulaPick) : [false, false];
  const pct = calib && kase ? closeness(kase, areaPick, formulaPick) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, areaPick, formulaPick) : false;

  sceneRef.current = {
    P,
    n: SLATS[slatIdx],
    slatIdx,
    sweepP,
    kase,
    slatsMode: !!current.slats,
    odometer: !!current.odometer,
    speed: !!current.speed,
    calib,
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

    const bandH = 50;
    const xs = S.calib && S.kase ? frac(S.kase.b) : frac(S.sweepP, 4);
    const xsv = fVal(xs);
    const evalF = (t) => fVal(S.P.c[0]) + fVal(S.P.c[1]) * t + fVal(S.P.c[2]) * t * t;

    /* a panel: world→pixel mapper + axes */
    const panel = (x0, x1, y0, y1, ymax) => {
      const XMIN = -0.4;
      const XMAX = 4.6;
      const kx = (x1 - x0) / (XMAX - XMIN);
      const ky = (y1 - y0) / (ymax + 0.6);
      const px = (X, Y) => [x0 + (X - XMIN) * kx, y1 - (Y + 0.2) * ky];
      ctx.strokeStyle = 'rgba(91,107,123,0.5)';
      ctx.lineWidth = 1.2;
      const [ax0, ay0] = px(0, 0);
      ctx.beginPath();
      ctx.moveTo(x0, ay0);
      ctx.lineTo(x1, ay0);
      ctx.moveTo(ax0, y0);
      ctx.lineTo(ax0, y1);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let v = 1; v <= 4; v++) ctx.fillText(String(v), px(v, 0)[0], ay0 + 4);
      return px;
    };

    const drawRoad = (px, withRegion) => {
      if (withRegion && xsv > 0) {
        ctx.fillStyle = 'rgba(185,135,24,0.20)';
        ctx.beginPath();
        ctx.moveTo(...px(0, 0));
        for (let t = 0; t <= xsv + 1e-9; t += 0.03) ctx.lineTo(...px(Math.min(t, xsv), evalF(Math.min(t, xsv))));
        ctx.lineTo(...px(xsv, 0));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(...px(0, evalF(0)));
      for (let t = 0; t <= 4.5; t += 0.03) ctx.lineTo(...px(t, evalF(t)));
      ctx.stroke();
    };
    const roadLabel = (x, y) => {
      ctx.fillStyle = BLUE;
      ctx.font = '700 11.5px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(S.P.fStr, x, y);
    };

    if (S.odometer) {
      /* -------- two panels: the odometer above, the road below -------- */
      const midY = bandH + Math.floor((H - bandH - 34) / 2);
      const pxA = panel(16, W - 16, bandH + 12, midY - 6, 9);
      const pxF = panel(16, W - 16, midY + 18, H - 34, 5);

      drawRoad(pxF, true);

      /* panel titles */
      ctx.fillStyle = CARMINE;
      ctx.font = 'italic 600 11.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('the odometer A(x)', pxA(0.1, 0)[0], bandH + 14);
      roadLabel(pxF(0.1, 0)[0], midY + 20);

      /* the odometer curve, 0 → xs */
      const evalA = (t) =>
        fVal(S.P.c[0]) * t + (fVal(S.P.c[1]) * t * t) / 2 + (fVal(S.P.c[2]) * t * t * t) / 3;
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(...pxA(0, 0));
      for (let t = 0; t <= xsv + 1e-9; t += 0.03) {
        const tc = Math.min(t, xsv);
        ctx.lineTo(...pxA(tc, evalA(tc)));
      }
      ctx.stroke();
      const Anow = trueA(S.P, xs);
      const [dx, dy] = pxA(xsv, fVal(Anow));
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.arc(dx, dy, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = xsv > 3 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        `A(${xText(S.sweepP)}) = ${fracText(Anow)}`,
        xsv > 3 ? dx - 9 : dx + 9,
        dy - 2
      );

      /* the sweep edge on the road panel */
      if (xsv > 0) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(...pxF(xsv, 0));
        ctx.lineTo(...pxF(xsv, Math.max(evalF(xsv), 0.4)));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* the speed readout: the last quarter-step's trap */
      if (S.speed && S.sweepP >= 1) {
        const xPrev = frac(S.sweepP - 1, 4);
        const gained = fSub(Anow, trueA(S.P, xPrev));
        const rate = fMul(gained, frac(4));
        const lo = fAt(S.P, xPrev);
        const hi = fAt(S.P, xs);
        /* shade the last quarter on the road panel */
        const xpv = fVal(xPrev);
        ctx.fillStyle = 'rgba(185,135,24,0.42)';
        const [qx0, qy0] = pxF(xpv, fVal(lo));
        const [qx1, qy1] = pxF(xsv, 0);
        ctx.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
        ctx.fillStyle = INK_HEX;
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const rx = W - 22;
        ctx.fillText(`last ¼ gained ${fracText(gained)}`, rx, bandH + 14);
        ctx.fillText(`rate = ×4 = ${fracText(rate)}`, rx, bandH + 30);
        ctx.fillStyle = CARMINE;
        ctx.fillText(`${fracText(lo)} ≤ ${fracText(rate)} ≤ ${fracText(hi)}`, rx, bandH + 46);
      }
    } else {
      /* -------- one panel: the road (+ slats and ledger, or the audit) ---- */
      const ledgerW = S.slatsMode ? Math.min(238, W * 0.34) : 0;
      const pxF = panel(16, W - ledgerW - 14, bandH + 14, H - 36, 5);

      if (S.slatsMode) {
        /* the two brigades */
        const n = S.n;
        const w = xsv / n;
        for (let k = 0; k < n; k++) {
          const t0 = k * w;
          const t1 = (k + 1) * w;
          const hL = evalF(t0);
          const hR = evalF(t1);
          const [ux0, uy0] = pxF(t0, hL);
          const [ux1, uy1] = pxF(t1, 0);
          ctx.fillStyle = 'rgba(185,135,24,0.30)';
          ctx.fillRect(ux0, uy0, ux1 - ux0, uy1 - uy0);
          const [ox0, oy0] = pxF(t0, hR);
          ctx.strokeStyle = 'rgba(185,135,24,0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(ox0, oy0, ux1 - ox0, uy1 - oy0);
        }
        drawRoad(pxF, false);
        roadLabel(pxF(0.1, 0)[0], bandH + 10);

        /* the trap ledger */
        const tx = W - ledgerW + 4;
        ctx.fillStyle = INK_SOFT;
        ctx.font = 'italic 600 11.5px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('the trap ledger', tx, bandH + 8);
        ctx.font = '600 11px ui-monospace, monospace';
        let rowY = bandH + 28;
        for (let i = 0; i <= S.slatIdx; i++) {
          const nn = SLATS[i];
          const L = leftSum(S.P, nn, xs);
          const R = rightSum(S.P, nn, xs);
          ctx.fillStyle = GOLD;
          ctx.fillText(`n=${nn}`, tx, rowY);
          ctx.fillStyle = INK_HEX;
          ctx.fillText(`${fracText(L)} → ${fracText(R)}`, tx + 46, rowY);
          rowY += 18;
        }
        const truth = trueA(S.P, xs);
        const g = gapOf(S.P, S.n, xs);
        ctx.fillStyle = CARMINE;
        ctx.fillText(
          g.n === 0 ? `agreed: ${fracText(truth)}` : `every trap holds ${fracText(truth)}`,
          tx,
          rowY + 6
        );
      } else {
        /* the audit scene: region to b, posted edge */
        drawRoad(pxF, true);
        roadLabel(pxF(0.1, 0)[0], bandH + 10);
        if (S.kase) {
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(...pxF(fVal(xs), 0));
          ctx.lineTo(...pxF(fVal(xs), 4.8));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = CARMINE;
          ctx.font = '700 12px ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`b = ${S.kase.b}`, pxF(fVal(xs), 4.8)[0] + 6, pxF(0, 4.8)[1]);
        }
      }
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CARMINE;
    ctx.font = '700 14.5px ui-monospace, monospace';
    ctx.fillText(
      S.calib && S.kase ? `${S.P.story} · stop at x = ${S.kase.b}` : S.P.story,
      W / 2,
      bandH / 2
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

  /* every step opens on the scene its words describe */
  useEffect(() => {
    const st = STEPS[step];
    setPresetId(st.preset);
    setSlatIdx(0);
    setSweepP(st.sweep ? 8 : QMAX);
    setAreaPick(null);
    setFormulaPick(null);
    if (st.calib) setKase(makeCase(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setSlatIdx(0);
    setSweepP(current.sweep ? 8 : QMAX);
    setAreaPick(null);
    setFormulaPick(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const xsNow = calib && kase ? frac(kase.b) : frac(sweepP, 4);
  const Lnow = leftSum(P, SLATS[slatIdx], xsNow);
  const Rnow = rightSum(P, SLATS[slatIdx], xsNow);
  /* accessibility — the spoken summary for screen readers */
  const spoken = calib
    ? `The audit: ${P.story}, stop at ${kase ? kase.b : '?'}. Area ruled ${areaPick ?? 'nothing'}; formula ${formulaPick ?? 'unruled'}. ${calibrated ? 'Calibrated.' : ''}`
    : current.odometer
      ? `${P.story}. Swept to x = ${xText(sweepP)}; area banked ${fracText(trueA(P, xsNow))}.`
      : `${P.story}. ${SLATS[slatIdx]} slats: under ${fracText(Lnow)}, over ${fracText(Rnow)}; the true area ${fracText(trueA(P, xsNow))} lies between.`;

  return (
    <div className="itlab">
      <header className="head">
        <h1>The Integral: Cornered Area, and the Odometer</h1>
        <p className="lede">
          Two brigades of slats trap the area under a road — the{' '}
          <em>integral</em> is the one number inside every trap. Then sweep the edge: the
          area odometer <span className="mono">A(x)</span> grows at exactly the road’s own
          height. That is the <em>Fundamental Theorem of Calculus</em>. Every number on
          this bench is an exact fraction: the doubt lives only in the trap, never in the
          arithmetic.
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
          </p>

          {(current.slats || current.sweep) && (
            <div className="dials">
              {current.slats && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the brigade’s size</span>
                    <span className="dial-v mono">n = {SLATS[slatIdx]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={SLATS.length - 1}
                    step={1}
                    value={slatIdx}
                    onChange={(e) => setSlatIdx(Number(e.target.value))}
                    aria-label={`Slat count, ${SLATS[slatIdx]}`}
                  />
                </div>
              )}
              {current.sweep && (
                <div className="dial">
                  <div className="dial-head">
                    <span className="dial-k">the sweep</span>
                    <span className="dial-v mono">x = {xText(sweepP)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={QMAX}
                    step={1}
                    value={sweepP}
                    onChange={(e) => setSweepP(Number(e.target.value))}
                    aria-label={`Sweep, x equals ${xText(sweepP)}`}
                  />
                </div>
              )}
            </div>
          )}

          <div className="toolbar" role="group" aria-label="Roads">
            {current.chips &&
              presetIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={'chipbtn' + (presetId === id ? ' active' : '')}
                  onClick={() => setPresetId(id)}
                >
                  {PRESETS[id].label}
                </button>
              ))}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
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

          {calib && kase && (
            <div className="calib">
              <div className="target-card">
                <span className="target-k">The posted account</span>
                <span className="target-word">
                  {P.label} · to x = {kase.b}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the exact area, ruled</li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the odometer’s formula, ruled
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Area ruling">
                  {areaChips(kase).map((c2) => (
                    <button
                      type="button"
                      key={c2}
                      className={'declbtn mono' + (areaPick === c2 ? ' active' : '')}
                      onClick={() => setAreaPick(c2)}
                    >
                      {c2}
                    </button>
                  ))}
                </div>
                <div className="declare" role="group" aria-label="Formula ruling">
                  {FORMULA_CHIPS.map((f2) => (
                    <button
                      type="button"
                      key={f2}
                      className={'declbtn reason mono' + (formulaPick === f2 ? ' active' : '')}
                      onClick={() => setFormulaPick(f2)}
                    >
                      {f2}
                    </button>
                  ))}
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'both ruled, exactly — the account balances'
                    : checks[0]
                      ? 'area ruled — now the odometer’s formula'
                      : 'corner the area first'}
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
                  <span className="mono target-hint">the area · then the formula</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase));
                  setAreaPick(null);
                  setFormulaPick(null);
                }}
              >
                Next case
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
                  setKase(null);
                  setAreaPick(null);
                  setFormulaPick(null);
                  setPresetId('flat');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">the trap defines it · the odometer explains it</span>{' '}
        &nbsp;·&nbsp; the integral is the one number inside every under/over trap, and the
        accumulated area grows at exactly the road’s height — the derivative bench’s gesture,
        run in reverse.
      </footer>

      <style jsx>{`
        .itlab {
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
            aspect-ratio: 4 / 5;
            min-height: 380px;
          }
        }
        .dials {
          margin: 12px 4px 0;
          display: grid;
          gap: 8px;
        }
        .dial {
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 8px;
          background: var(--paper);
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
        .dial-v {
          font-size: 13px;
          color: var(--gold);
          font-weight: 700;
        }
        .dial input[type='range'] {
          width: 100%;
          accent-color: var(--gold);
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .chipbtn {
          font: 600 12px/1.2 system-ui, sans-serif;
          padding: 8px 11px;
          border-radius: 8px;
          cursor: pointer;
          border: 1.5px solid rgba(63, 116, 166, 0.55);
          background: var(--paper);
          color: var(--blue);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
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
          font-family: var(--serif);
          font-size: 21px;
          font-weight: 600;
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
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 11px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
        }
        .declbtn.reason {
          font-size: 11.5px;
          font-weight: 600;
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
        :global(.itlab) :focus-visible {
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
