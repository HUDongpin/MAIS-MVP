'use client';

/* ============================================================================
   BestFitLab — an interactive "bench" for the LINE OF BEST FIT and its
   RESIDUALS: a straight line as a MODEL laid over scattered data, the
   vertical misses as the model's errors, and "best" as the line whose
   squared misses total least.

        every dot hangs a MISS from the line — the residual
        square the misses, add them up: the SCORE.  Best = least.

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab with
   the HS on-ramp — CCSS 8.SP.A.2 ("for scatter plots that suggest a linear
   association, informally fit a straight line, and informally assess the
   model fit by judging the closeness of the data points to the line"),
   8.SP.A.3 (use the linear model; interpret slope and intercept in
   context), and S-ID.B.6b–c (fit a linear function, assess with residuals).
   The sequel to ScatterPlotLab: that bench described the cloud; this one
   lays a ruler over it.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   dials that unlock one per lesson step, predict-then-check questions gated
   on ANSWERED (not correct), and a calibration challenge with a live meter
   and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE MISSES ARE THE OBJECT."
     The line here is a TOOL — gold, adjustable, deliberately not the star.
     The carmine belongs to the RESIDUALS: from every dot hangs its
     vertical miss, and each miss GROWS A LITERAL SQUARE whose area is the
     miss squared.  The SCORE is the total carmine area on the screen, and
     fitting is a hunt: drag the rate and the start until the carmine is as
     small as your ruler can make it.  "Least squares" stops being a phrase
     — it is the picture, and the best line is the one you can no longer
     improve.  Two honest facts ride along: at the best line the misses
     CANCEL (they sum to exactly zero — engineered into every dataset and
     proved in the audit), and the same best line can summarize one cloud
     nine times better than another — the score, not the line, judges the
     model (the loose cloud scores exactly 9× the tight one, by design).

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • LineFunctionLab owns y = m·x + b AS THE OBJECT — the carmine line,
       the slope triangle, rise over run.  Here the line is DEMOTED: gold,
       a tool, named in context ("the rate", "the start"), and NO slope
       triangle is ever drawn — the misses wear the accent.  The fitted
       equation appears only as the model's label, which 8.SP.A.3 demands.
     • ScatterPlotLab (8.SP.A.1) owns the cloud's description — the rugs,
       association words, the outlier theorem.  None of that vocabulary
       returns here; the clouds arrive pre-described and the subject is
       the FIT.
     • MeanLab owns the fair-share mean; VarianceLab owns spread and MAD.
       No average of one variable is ever computed here — the only
       statistic is the score, and it belongs to the LINE, not to either
       variable.
     • QuadraticFunctionLab owns parabola dials.  The score is a quadratic
       function of the dials, but no parabola is drawn and no vertex named:
       the minimum is HUNTED, not solved (the calculus benches may some day
       solve it; Grade 8 hunts, honestly).
     • EquationLab owns the balance scale.  The misses "cancel" is shown as
       an over/under tally, never as scales or planks.

   Colour (the SystemsOfEquationsLab three-colour relaxation, documented):
   CARMINE = the residuals — the misses, their squares, the score.  BLUE =
   the data (the cloud).  GOLD = the candidate line, the adjustable tool.
   GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • The rate dial holds HALVES (m = m2/2 with integer m2) and the start
       dial holds integers, over integer data — so the score is EXACT:
       the lab computes SSR4 = Σ(2y − m2·x − 2b)², an integer, and shows
       score = SSR4/4 (always a clean quarter).  No float ever decides.
     • Every dataset is ENGINEERED so its true least-squares line sits
       exactly on the dial grid: the shipped residual patterns are
       orthogonal to both the constant and the x vector (Σr = 0 and
       Σx·r = 0 — the audit verifies both identities), so the grid minimum
       IS the honest least-squares line, it is UNIQUE on the grid (audited
       by brute force over all 169 dial states), and at it the misses sum
       to exactly zero.
     • The loose cloud is the tight cloud's residuals tripled — same best
       line, exactly 9× the score; the audit proves both facts.
     • The calibration stamp needs two facts at once: the score equals the
       grid MINIMUM (brute-force-derived, never stored), AND the forecast
       at the posted x* is read off that best line correctly (the foil
       chips are the habitual wrongs; the forecast only counts once the
       line is truly best).  Audited over every case × every dial state ×
       every chip.
   Verified by audit-bestfit.mjs (numeric proof + source greps) and
   verify-bestfit.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/BestFitLab.jsx
     2. Import and render it:
          import BestFitLab from './BestFitLab';
          export default function Page() { return <BestFitLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (m2, b, the
              dataset, the lesson step, answers, the case, the forecast).
     MODEL  — exact integer arithmetic (SSR4, grid minima, residual
              tallies); it knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  Two dials in context: the RATE (slope, in halves)
   and the START (intercept).  They unlock together at the miss step.
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the residuals: misses, squares, the score
const BLUE = '#3f74a6'; // the data
const GOLD = '#b98718'; // the candidate line — the tool
const INK_HEX = '#1c2b3a';

const PARAMS = [
  { key: 'm2', label: 'the rate (per 1 across)', min: -6, max: 6, step: 1, unlock: 1 }, // slope = m2/2
  { key: 'b', label: 'the start (at 0 across)', min: 0, max: 12, step: 1, unlock: 1 },
];
const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer scoring; grid minima derived, never stored.
   ------------------------------------------------------------------------- */
/* the doubled residual of one point: 2·(y − (m2/2)x − b) — an integer */
const resid2 = ([x, y], m2, b) => 2 * y - m2 * x - 2 * b;
/* the score, quarter-scaled to stay integer: SSR4 = Σ(2r)² = 4·Σr² */
const ssr4 = (pts, m2, b) => pts.reduce((a, p) => a + resid2(p, m2, b) ** 2, 0);
const scoreText = (s4) => (s4 % 4 === 0 ? String(s4 / 4) : (s4 / 4).toFixed(2));
/* the sum of misses, doubled: Σ2r — zero exactly at the honest best line */
const sumResid2 = (pts, m2, b) => pts.reduce((a, p) => a + resid2(p, m2, b), 0);
/* the grid minimum, brute-forced over every dial state */
function gridMin(pts) {
  let best = Infinity;
  let arg = null;
  let count = 0;
  for (let m2 = -6; m2 <= 6; m2++) {
    for (let b = 0; b <= 12; b++) {
      const s = ssr4(pts, m2, b);
      if (s < best) {
        best = s;
        arg = { m2, b };
        count = 1;
      } else if (s === best) count++;
    }
  }
  return { best, arg, unique: count === 1 };
}
const slopeText = (m2) =>
  m2 === 0 ? '0' : m2 % 2 === 0 ? String(m2 / 2) : `${m2 < 0 ? '−' : ''}${Math.abs(m2)}/2`;
/* the model's forecast at x, in halves: 2ŷ = m2·x + 2b */
const predict2 = (m2, b, x) => m2 * x + 2 * b;

/* the datasets — every one engineered so the true least-squares line sits
   ON the dial grid (residual pattern ⊥ 1 and ⊥ x; see the audit) */
const DATA = {
  tight: {
    label: 'practice hours vs free throws',
    x: 'practice hours',
    y: 'free throws made',
    pts: [[0, 3], [2, 2], [4, 4], [6, 4], [8, 7], [10, 7]],
  },
  loose: {
    label: 'a wilder team, same drill',
    x: 'practice hours',
    y: 'free throws made',
    /* the tight cloud's misses, tripled: same best line, 9× the score */
    pts: [[0, 5], [2, 0], [4, 4], [6, 2], [8, 9], [10, 7]],
  },
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The forecaster."  Fit the posted cloud to the
   lowest score the ruler allows, then read the forecast off the best line.
   ------------------------------------------------------------------------- */
const DOCKET = [
  {
    id: 'f1',
    x: 'weeks of training',
    y: 'laps per session',
    pts: [[0, 2], [2, 2], [4, 5], [6, 6], [8, 10], [10, 11]],
    xStar: 13,
  },
  {
    id: 'f2',
    x: 'price per snack',
    y: 'snacks sold',
    pts: [[0, 11], [2, 8], [4, 8], [6, 6], [8, 7], [10, 5]],
    xStar: 14,
  },
  {
    id: 'f3',
    x: 'plant food doses',
    y: 'flowers open',
    pts: [[0, 5], [2, 4], [4, 6], [6, 6], [8, 9], [10, 9]],
    xStar: 16,
  },
];
function makeCase(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
/* forecast chips: the truth read off the best line, plus habitual wrongs */
function forecastChips(kase) {
  const g = gridMin(kase.pts);
  const t2 = predict2(g.arg.m2, g.arg.b, kase.xStar);
  const fmt = (v2) => (v2 % 2 === 0 ? String(v2 / 2) : (v2 / 2).toFixed(1));
  return [
    { s: fmt(t2), ok: true },
    { s: fmt(t2 + 4), ok: false }, // drifted high
    { s: fmt(t2 - 4), ok: false }, // drifted low
    { s: String(g.arg.b), ok: false }, // forgot the rate entirely
  ];
}
const calibChecks = (kase, m2, b, declared) => {
  if (!kase) return [false, false];
  const g = gridMin(kase.pts);
  const atMin = ssr4(kase.pts, m2, b) === g.best;
  const truth = forecastChips(kase).find((c) => c.ok).s;
  return [atMin, atMin && declared != null && declared === truth];
};
const closeness = (kase, m2, b, declared) =>
  Math.round((100 * calibChecks(kase, m2, b, declared).filter(Boolean).length) / 2);
const isCalibrated = (kase, m2, b, declared) => calibChecks(kase, m2, b, declared).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the dials unlock at the miss step;
   the reveal lives in the feedback.  The distractors are the real beliefs:
   that the line must hit the dots, that misses below don't count, that a
   good line means a good cloud.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'The summary line',
    body:
      'A cloud you have met before — and a gold line laid over it. The line touches almost ' +
      'nothing, and it is not trying to: it is a MODEL, one straight rule that summarizes the ' +
      'whole drift.',
    data: 'tight',
    demo: { m2: 1, b: 2 },
    lockDials: true,
    q: 'What is the gold line FOR?',
    choices: [
      'A summary — one rule for the drift, good enough to predict with',
      'A path through every dot, if you bend it enough',
      'A boundary the dots must not cross',
    ],
    answer: 0,
    feedback:
      'A summary. Real data never sits on one line, so the model’s job is to be USEFULLY ' +
      'wrong everywhere rather than perfectly right nowhere — one rate, one start, and a ' +
      'forecast for any input you ask about. How wrong it is, per dot, is the next step.',
  },
  {
    title: 'The misses',
    body:
      'The dials are live — and the line starts badly on purpose. From every dot hangs its ' +
      'MISS (its residual): the vertical gap from dot to line. Above the line counts +, below ' +
      'counts −.',
    data: 'tight',
    demo: { m2: 0, b: 6 },
    q: 'With the flat line at height 6, the dot at (8, 7) has residual…',
    choices: ['+1 — the dot sits 1 above the model', '−1 — the model is above the dot', '15'],
    answer: 0,
    feedback:
      'Residual = dot − model = 7 − 6 = +1: the model under-predicts that player by one free ' +
      'throw. Signs matter — a miss above and a miss below are different failures — and every ' +
      'dot files its own complaint. Six dots, six residuals, one line to blame.',
  },
  {
    title: 'Square the misses — the score',
    body:
      'Each miss now grows a SQUARE with the miss as its side, and the SCORE is the total ' +
      'carmine area. Wiggle both dials and watch the score breathe.',
    data: 'tight',
    demo: { m2: 0, b: 6 },
    score: true,
    q: 'Why square the misses instead of just adding them?',
    choices: [
      'So + and − misses both count against the model — and big misses count extra',
      'Because squares are easier to draw than segments',
      'To make the score come out even',
    ],
    answer: 0,
    feedback:
      'Add raw misses and a +2 cancels a −2 — a terrible line could score zero by missing ' +
      'symmetrically. Squaring makes every miss cost something and charges big misses ' +
      'quadratically: one miss of 3 (area 9) outweighs nine misses of 1. That pricing is the ' +
      'whole personality of "least squares."',
  },
  {
    title: 'Hunt the minimum',
    body:
      'Now fit. Work the rate and the start until the score will not go lower — your ruler ' +
      'reaches its best at score 4.',
    data: 'tight',
    demo: { m2: 0, b: 6 },
    score: true,
    q: 'At the best line, look at the over/under tally. The misses…',
    choices: [
      'Cancel exactly — they sum to zero; the line splits the cloud’s errors evenly',
      'Are all zero',
      'Are all above the line',
    ],
    answer: 0,
    feedback:
      'They sum to exactly zero: +1 −1 +0 −1 +1 +0. The best line does not eliminate misses — ' +
      'it EVENS OUT their total while crushing their squares. (For this cloud the honest ' +
      'least-squares line is rate 1/2, start 2, and it sits exactly on your dials — the audit ' +
      'checks that promise.)',
  },
  {
    title: 'Same line, worse cloud',
    body:
      'A wilder team, same drill. Fit it — the best line comes out IDENTICAL (rate 1/2, ' +
      'start 2), but the best score is 36, nine times worse.',
    data: 'loose',
    demo: { m2: 1, b: 2 },
    score: true,
    chips: ['tight', 'loose'],
    q: 'Same best line, score 4 vs score 36. What does the score add that the line cannot say?',
    choices: [
      'How well the line summarizes — the fit’s quality, judged by closeness',
      'Which cloud has more dots',
      'Which team practiced longer',
    ],
    answer: 0,
    feedback:
      'The line says WHAT the drift is; the score says HOW FAITHFULLY the cloud follows it. ' +
      'Identical models, very different trust. That is 8.SP.A.2’s "assess the model fit by ' +
      'judging closeness" — and it is why a forecast from the wild team deserves wider ' +
      'error bars, a story the HS statistics benches pick up.',
  },
  {
    title: 'Reading the model',
    body:
      'The fitted model reads: free throws ≈ 1/2 · hours + 2. Two numbers, two meanings — in ' +
      'context, always in context.',
    data: 'tight',
    demo: { m2: 1, b: 2 },
    score: true,
    q: 'In context, the rate 1/2 says…',
    choices: [
      'About one extra free throw per TWO extra practice hours — on average, across the team',
      'Every player makes exactly half their throws',
      'Half the players improved',
    ],
    answer: 0,
    feedback:
      'Per two hours of practice, roughly one more free throw — a statement about the ' +
      'TENDENCY, not a promise to any one player. And the start, 2: a player with zero ' +
      'practice hours is modeled at about 2 free throws. Slope and intercept only mean ' +
      'anything wearing their units (8.SP.A.3).',
  },
  {
    title: 'The forecaster',
    body:
      'A cloud is posted, with a question mark beyond its edge. Fit the line to the lowest ' +
      'score your ruler allows — then read the forecast at the posted input off your best ' +
      'line.',
    data: 'tight',
    demo: { m2: 0, b: 6 },
    score: true,
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function BestFitLab() {
  const [m2, setM2] = useState(1);
  const [b, setB] = useState(2);
  const [dataKey, setDataKey] = useState('tight');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [declared, setDeclared] = useState(null);
  const [chipSet, setChipSet] = useState([]);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  const current = STEPS[step];
  const calib = !!current.calib;
  const pts = calib && kase ? kase.pts : DATA[dataKey].pts;
  const meta = calib && kase ? kase : DATA[dataKey];

  const checks = calib ? calibChecks(kase, m2, b, declared) : [false, false];
  const pct = calib && kase ? closeness(kase, m2, b, declared) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, m2, b, declared) : false;

  const s4 = ssr4(pts, m2, b);
  const sum2 = sumResid2(pts, m2, b);

  sceneRef.current = { pts, meta, m2, b, score: !!current.score || calib, calib, kase, step };

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

    const bandH = 58;
    const padL = 64;
    const padB = 56;
    const padR = 26;
    const padT = 16;
    const plotW = W - padL - padR;
    const plotH = H - bandH - padT - padB;
    const xMax = S.calib && S.kase ? Math.max(12.8, S.kase.xStar + 1) : 12.8;
    const k = Math.min(plotW / xMax, plotH / 13.4);
    const ox = padL;
    const oy = bandH + padT + plotH;
    const px = (X, Y) => [ox + X * k, oy - Y * k];

    /* axes */
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + (xMax - 0.2) * k, oy);
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - 13 * k);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= Math.floor(xMax); v += 2) ctx.fillText(String(v), ox + v * k, oy + 6);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 2; v <= 12; v += 2) ctx.fillText(String(v), ox - 7, oy - v * k);
    ctx.fillStyle = INK;
    ctx.font = 'italic 600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(S.meta.x + ' →', ox + (xMax * k) / 2, oy + 22);
    ctx.save();
    ctx.translate(ox - 40, oy - 6.5 * k);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(S.meta.y + ' →', 0, 0);
    ctx.restore();

    const yAt = (X) => (S.m2 * X) / 2 + S.b;

    /* the residuals and their literal squares — carmine, the object */
    for (const [x, y] of S.pts) {
      const r = y - yAt(x); // for pixels only; the model uses resid2
      const [dx, dyDot] = px(x, y);
      const [, dyLine] = px(x, yAt(x));
      if (S.step >= 1 || S.calib) {
        /* the square grows off the residual segment */
        if (S.score && Math.abs(r) > 0.001) {
          const side = Math.abs(r) * k;
          const sx = x + Math.abs(r) <= xMax - 0.3 ? dx : dx - side;
          ctx.fillStyle = 'rgba(200,30,79,0.14)';
          ctx.strokeStyle = 'rgba(200,30,79,0.5)';
          ctx.lineWidth = 1;
          ctx.fillRect(sx, Math.min(dyDot, dyLine), side, side);
          ctx.strokeRect(sx, Math.min(dyDot, dyLine), side, side);
        }
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, dyDot);
        ctx.lineTo(dx, dyLine);
        ctx.stroke();
      }
    }

    /* the candidate line — gold, the tool */
    {
      const [x1, y1] = px(0, yAt(0));
      const [x2, y2] = px(xMax - 0.2, yAt(xMax - 0.2));
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    /* the data — blue, quiet */
    for (const [x, y] of S.pts) {
      const [dx, dy] = px(x, y);
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(dx, dy, 6.2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    /* the forecast post (capstone): the ?-mark at x* */
    if (S.calib && S.kase) {
      const xs = S.kase.xStar;
      const [fx] = px(xs, 0);
      ctx.strokeStyle = '#1f8a5b';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, oy);
      ctx.lineTo(fx, oy - 12.6 * k);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1f8a5b';
      ctx.font = '700 14px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('?', fx, oy - 12.7 * k);
    }

    /* ---- the readout band ---- */
    ctx.textBaseline = 'middle';
    const s4Now = ssr4(S.pts, S.m2, S.b);
    const sumNow = sumResid2(S.pts, S.m2, S.b);
    if (S.score) {
      ctx.font = '700 16px ui-monospace, monospace';
      const over = sumNow > 0 ? `over by ${scoreText(2 * sumNow)}` : sumNow < 0 ? `under by ${scoreText(-2 * sumNow)}` : 'over/under: 0 — the misses cancel';
      const parts = [
        [`score ${scoreText(s4Now)}`, CARMINE],
        ['   ·   ', INK_SOFT],
        [`model: y = ${slopeText(S.m2)}·x + ${S.b}`, GOLD],
        ['   ·   ', INK_SOFT],
        [sumNow === 0 ? 'misses cancel' : over, sumNow === 0 ? '#1f8a5b' : INK_SOFT],
      ];
      const totalW = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
      let xPen = W / 2 - totalW / 2;
      ctx.textAlign = 'left';
      for (const [s, col] of parts) {
        ctx.fillStyle = col;
        ctx.fillText(s, xPen, bandH / 2);
        xPen += ctx.measureText(s).width;
      }
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = GOLD;
      ctx.font = '700 16px ui-monospace, monospace';
      ctx.fillText(`model: y = ${slopeText(S.m2)}·x + ${S.b}`, W / 2, bandH / 2);
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
    const s = STEPS[step];
    setDataKey(s.data);
    if (s.demo) {
      setM2(s.demo.m2);
      setB(s.demo.b);
    }
    if (s.calib) {
      const c = makeCase(null);
      setKase(c);
      setDeclared(null);
      setChipSet(forecastChips(c).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    const s = STEPS[step];
    if (s.demo) {
      setM2(s.demo.m2);
      setB(s.demo.b);
    }
    setDeclared(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const spoken = calib
    ? `The forecaster: ${kase ? kase.x + ' vs ' + kase.y : ''}; forecast wanted at ${kase ? kase.xStar : '…'}. ` +
      `Model y = ${slopeText(m2)}·x + ${b}, score ${scoreText(s4)}. Declared ${declared ?? 'nothing'}. ${
        calibrated ? 'Calibrated.' : ''
      }`
    : `${meta.label}: model y = ${slopeText(m2)}·x + ${b}; score ${scoreText(s4)}; misses ${
        sum2 === 0 ? 'cancel exactly' : sum2 > 0 ? 'lean under the cloud' : 'lean over the cloud'
      }.`;

  return (
    <div className="bflab">
      <header className="head">
        <h1>Best Fit: The Misses Are the Object</h1>
        <p className="lede">
          Lay a line over a cloud and every dot hangs a <em>miss</em>. Square the misses, add
          the areas: the <em>score</em>. The best line is the one you cannot improve — where
          the misses <span className="mono">cancel</span> and the carmine is least.
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

          <div className="dials">
            {PARAMS.map((p) => {
              const locked = step < p.unlock && !calib;
              const value = p.key === 'm2' ? m2 : b;
              return (
                <div key={p.key} className={'dial' + (locked ? ' locked' : '')}>
                  <div className="dial-head">
                    <span className="dial-k">
                      {p.label} {locked && <span className="lock">🔒</span>}
                    </span>
                    <span className="dial-v mono">{p.key === 'm2' ? slopeText(m2) : b}</span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={value}
                    disabled={locked}
                    onChange={(e) => (p.key === 'm2' ? setM2(Number(e.target.value)) : setB(Number(e.target.value)))}
                    aria-label={`${p.label}, ${p.key === 'm2' ? slopeText(m2) : b}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="toolbar" role="group" aria-label="Clouds">
            {current.chips &&
              current.chips.map((dk) => (
                <button
                  type="button"
                  key={dk}
                  className={'chipbtn' + (dataKey === dk ? ' active' : '')}
                  onClick={() => setDataKey(dk)}
                >
                  {DATA[dk].label}
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
                <span className="target-k">The commission</span>
                <span className="target-word">
                  {kase.x} vs {kase.y} — forecast at {kase.xStar}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>
                    {checks[0] ? '✓' : '·'} the lowest score the ruler allows
                  </li>
                  <li className={checks[1] ? 'done' : ''}>
                    {checks[1] ? '✓' : '·'} the forecast at {kase.xStar}, off the best line
                  </li>
                </ol>
                <div className="declare" role="group" aria-label="Forecast">
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
                    ? `fit, then forecast: y(${kase.xStar}) = ${forecastChips(kase).find((c) => c.ok).s}`
                    : checks[0]
                      ? 'fitted — now read the line at the green post'
                      : 'lower the score first; the forecast only counts off the best line'}
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
                  <span className="mono target-hint">fit · then forecast</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const c = makeCase(kase.id);
                  setKase(c);
                  setDeclared(null);
                  setChipSet(forecastChips(c).sort(() => Math.random() - 0.5));
                }}
              >
                Next commission
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
                  setDeclared(null);
                  setM2(1);
                  setB(2);
                  setDataKey('tight');
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">miss · square · total · hunt</span> &nbsp;·&nbsp; fit a line
        informally and judge it by the closeness of the dots (CCSS 8.SP.A.2); use the model and
        read its rate and start in context (8.SP.A.3); the residuals carry the verdict
        (S-ID.B.6). The line is the tool; the misses are the object.
      </footer>

      <style jsx>{`
        .bflab {
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
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 460px) {
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
          border: 1.5px solid rgba(28, 43, 58, 0.28);
          background: var(--paper);
          color: var(--ink);
          transition: border-color 0.15s, background 0.15s;
        }
        .chipbtn.active {
          border-color: var(--blue);
          background: rgba(63, 116, 166, 0.1);
          color: var(--blue);
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
          font-size: 19px;
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
        :global(.bflab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
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
