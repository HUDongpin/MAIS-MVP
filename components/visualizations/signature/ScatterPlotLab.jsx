'use client';

/* ============================================================================
   ScatterPlotLab — an interactive "bench" for the SCATTER PLOT: two
   measurements per individual, one dot per individual, and the patterns —
   clustering, outliers, positive/negative association, linear/nonlinear —
   that only the PAIRING can show.

        one dot = one individual, carrying TWO numbers at once
        the two axes alone are blind — the pairing is the picture

   Built for MAIS (math AI system, www.mais.ac), K-12.  A GRADE 8 lab —
   CCSS 8.SP.A.1 is the anchor: "Construct and interpret scatter plots for
   bivariate measurement data to investigate patterns of association
   between two quantities.  Describe patterns such as clustering, outliers,
   positive or negative association, linear association, and nonlinear
   association."  Nine statistics labs stand in this library and every one
   is univariate or categorical; this lab opens the bivariate strand.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   a staged lesson that unlocks one capability per step, predict-then-check
   questions gated on ANSWERED (not correct), and a calibration challenge
   with a live meter and a CALIBRATED stamp that cannot fire falsely.

   THE SIGNATURE CENTERPIECE — "THE BLIND RUGS, AND THE PAIRING."
     Every dataset is a roster of INDIVIDUALS — twelve students, say — and
     each individual carries two measurements (hours studied, quiz score).
     Along each axis runs a RUG: the tick marks of ONE variable alone,
     which is exactly the univariate world the DataLab family owns.  The
     lab's owned move is the demonstration that THE RUGS ARE BLIND: both
     rugs stay identical while the pairing is shuffled, and the pattern
     appears or dies with the pairing only.  Tap any dot and its two rug
     marks light up — a dot is a CROSSING of one individual's two numbers.
     Association is then trend-talk about the cloud: positive (the cloud
     climbs), negative (it falls), none (it hums flat), and the deep
     honest case — a PERFECT PARABOLA of dots whose linear trend is
     exactly zero: "no linear association" is not "no pattern."  Clusters
     and the outlier close the vocabulary: the dot far from every
     neighbour, found by an exact gap rule, never by squinting.

   DELIBERATELY DISTINCT from its siblings (checked against the actual files —
   distinctness is a correctness property in this library):
     • DataLab owns the univariate DOT PLOT and the mean as balance;
       BoxPlotLab owns the five-number summary; MeanLab/MedianLab/ModeLab/
       VarianceLab own their statistics.  This lab computes NO average of
       any kind and never stacks same-valued dots into towers: its rugs are
       deliberately flat marginal shadows, drawn to be BLIND, and the only
       verdicts are about the pairing.
     • TableLab owns the categorical two-way table.  Nothing here is a
       category; both variables are measurements.
     • PointLab owns the ordered pair as an ADDRESS.  A dot here is an
       INDIVIDUAL — the roster names them — and no address language, no
       route arrows, no quadrant machinery appears.
     • LineFunctionLab owns y = mx + b; the roadmap's S3 owns the fitted
       line and its residuals.  THIS LAB NEVER DRAWS A LINE THROUGH THE
       CLOUD — no trend line, no fit, no slope.  Describing the climb is
       this lab; drawing the line is the next lab's whole story.
     • FunctionLab owns the one-output promise.  A scatter cloud is not a
       function and is never tested as one; no probe, no verdict of that
       kind.

   One-accent discipline: CARMINE is THE PATTERN — the association verdict,
   the outlier, the highlighted individual.  BLUE is the data (the dots and
   rugs).  GOLD is the SELECTION — the tapped individual and its two rug
   marks.  GREEN is reserved for "correct" and CALIBRATED.

   MATH CORRECTNESS CONTRACT (what a K-12 lab owes a student):
     • Every dataset is INTEGER pairs on a 0–12 grid, and every verdict is
       exact integer arithmetic: the trend's sign is the sign of
       n·Σxy − Σx·Σy (the covariance numerator, cleared of denominators —
       no float ever decides), the "no linear trend" dataset satisfies
       n·Σxy − Σx·Σy = 0 EXACTLY by construction, and the parabola dataset
       fits its quadratic EXACTLY (the audit reconstructs the quadratic
       from three points by integer elimination and verifies every pair).
     • The outlier is a THEOREM, not an impression: a dot is an outlier
       iff its nearest-neighbour squared distance exceeds 4× the largest
       nearest-neighbour squared distance among all other dots — an
       integer comparison, audited on every dataset (the pattern sets have
       none; the cluster and capstone sets have exactly one).
     • The blind-rugs claim is structural: the shuffled pairing used in
       step 2 is a permutation of the SAME y-multiset (audited), so both
       rugs are provably identical while the trend sign flips to zero.
     • The calibration stamp needs two facts at once: the ASSOCIATION
       verdict chip matches the derived truth, AND the OUTLIER evidence is
       right (the guilty dot tapped, or the explicit "no outlier" plea).
       Audited over every docket case × every chip × every tappable dot.
   Verified by audit-scatterplot.mjs (numeric proof + source greps) and
   verify-scatterplot.html (in-browser harness).

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ScatterPlotLab.jsx
     2. Import and render it:
          import ScatterPlotLab from './ScatterPlotLab';
          export default function Page() { return <ScatterPlotLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   Renders on the server safely: every browser-only API is behind a guard.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the dataset, the
              tapped individual, the lesson step, answers, the case).
     MODEL  — integer pair-tables with exact trend/outlier derivations; it
              knows nothing of pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  No dials: individuals are TAPPED, datasets are
   chosen by chip, verdicts are declared by chip (the gatekeeper pattern).
   ------------------------------------------------------------------------- */
const CARMINE = '#c81e4f'; // the pattern: verdict, outlier
const BLUE = '#3f74a6'; // the data: dots and rugs
const GOLD = '#b98718'; // the selection: one individual, two rug marks
const INK_HEX = '#1c2b3a';

const CALIB_STEP = 6;

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  Exact integer derivations on integer pair-tables.
   ------------------------------------------------------------------------- */
/* the trend's sign: n·Σxy − Σx·Σy, the covariance numerator with all
   denominators cleared — pure integer arithmetic */
const trendNum = (pts) => {
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
    sxy += x * y;
  }
  return n * sxy - sx * sy;
};
/* does one quadratic y = ax² + bx + c pass through EVERY point?  Solved by
   integer elimination from three distinct-x anchors, then verified with
   cross-multiplied integer arithmetic (denominators never divided out). */
function quadraticThrough(pts) {
  const xs = [...new Set(pts.map(([x]) => x))].sort((a, b) => a - b);
  if (xs.length < 3) return null;
  const at = (x) => pts.find(([px]) => px === x)[1];
  const [x1, x2, x3] = [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]];
  const [y1, y2, y3] = [at(x1), at(x2), at(x3)];
  /* a = [(y3−y1)(x2−x1) − (y2−y1)(x3−x1)] / [(x3²−x1²)(x2−x1) − (x2²−x1²)(x3−x1)] */
  const aNum = (y3 - y1) * (x2 - x1) - (y2 - y1) * (x3 - x1);
  const aDen = (x3 * x3 - x1 * x1) * (x2 - x1) - (x2 * x2 - x1 * x1) * (x3 - x1);
  if (aDen === 0) return null;
  /* b = [(y2−y1) − a(x2²−x1²)] / (x2−x1)  — keep everything over aDen */
  const bNum = (y2 - y1) * aDen - aNum * (x2 * x2 - x1 * x1);
  const bDen = aDen * (x2 - x1);
  /* verify every point: y·aDen·(x2−x1) === aNum(x2−x1)x² + bNum·x + c′ where
     c′ = y1·bDen − aNum(x2−x1)x1² − bNum·x1 */
  const cPrime = y1 * bDen - aNum * (x2 - x1) * x1 * x1 - bNum * x1;
  for (const [x, y] of pts) {
    if (y * bDen !== aNum * (x2 - x1) * x * x + bNum * x + cPrime) return null;
  }
  return { aNum, aDen };
}
/* the association verdict, derived */
const assocOf = (pts) => {
  const t = trendNum(pts);
  if (t > 0) return 'positive';
  if (t < 0) return 'negative';
  const q = quadraticThrough(pts);
  return q && q.aNum !== 0 ? 'nonlinear' : 'none';
};
/* the outlier: nearest-neighbour gap, exact.  A dot is an outlier iff its
   NN² exceeds 4× the largest NN² among the OTHER dots. */
const nnSq = (pts, i) => {
  let best = Infinity;
  for (let j = 0; j < pts.length; j++) {
    if (j === i) continue;
    const dx = pts[i][0] - pts[j][0];
    const dy = pts[i][1] - pts[j][1];
    best = Math.min(best, dx * dx + dy * dy);
  }
  return best;
};
const outliersOf = (pts) => {
  const nn = pts.map((_, i) => nnSq(pts, i));
  return pts
    .map((_, i) => i)
    .filter((i) => {
      const others = nn.filter((_, j) => j !== i);
      return nn[i] > 4 * Math.max(...others);
    });
};

/* the datasets — each a roster of individuals with a story */
const DATA = {
  study: {
    label: 'hours studied vs quiz score',
    x: 'hours studied',
    y: 'quiz score',
    pts: [[1, 3], [2, 4], [2, 5], [3, 5], [4, 6], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 10], [11, 11]],
  },
  shuffled: {
    label: 'the same numbers, pairing shuffled',
    x: 'hours studied',
    y: 'quiz score',
    /* the SAME x and y multisets as `study`, re-paired so the linear trend
       is EXACTLY zero: both rugs identical, the pattern gone — the audit
       proves both facts to the integer */
    pts: [[1, 5], [2, 10], [2, 8], [3, 6], [4, 4], [5, 7], [6, 9], [7, 11], [8, 6], [9, 3], [10, 5], [11, 10]],
  },
  screens: {
    label: 'evening screen hours vs hours of sleep',
    x: 'screen hours',
    y: 'hours of sleep',
    pts: [[1, 11], [2, 10], [3, 10], [4, 9], [5, 8], [6, 8], [7, 6], [8, 6], [9, 5], [10, 4], [11, 3], [12, 2]],
  },
  shoes: {
    label: 'shoe size vs quiz score',
    x: 'shoe size',
    y: 'quiz score',
    /* engineered so n·Σxy − Σx·Σy = 0 EXACTLY: each x's two scores sum to 12 */
    pts: [[2, 4], [2, 8], [4, 3], [4, 9], [6, 5], [6, 7], [8, 3], [8, 9], [10, 4], [10, 8]],
  },
  bounce: {
    label: 'launch angle vs distance',
    x: 'launch angle (notches)',
    y: 'distance',
    /* a perfect parabola with EXACTLY zero linear trend: y = (x−6)²/4 */
    pts: [[0, 9], [2, 4], [4, 1], [6, 0], [8, 1], [10, 4], [12, 9]],
  },
  teams: {
    label: 'two practice squads, and a visitor',
    x: 'sprint time',
    y: 'jump height',
    pts: [[1, 2], [2, 1], [2, 3], [3, 2], [9, 9], [10, 8], [10, 10], [11, 9], [11, 10], [3, 11]],
  },
};

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  "The field notebook."  A dataset is posted;
   describe the association, then rule on the outlier — tap it, or plea
   that none exists.
   ------------------------------------------------------------------------- */
const DOCKET = [
  {
    id: 'c1',
    x: 'practice throws',
    y: 'ring hits',
    pts: [[1, 2], [2, 3], [3, 3], [4, 4], [5, 5], [6, 5], [7, 6], [8, 7], [11, 1]], // positive + outlier
  },
  {
    id: 'c2',
    x: 'days since watering',
    y: 'leaf freshness',
    pts: [[1, 12], [2, 11], [3, 10], [4, 10], [5, 8], [6, 7], [7, 7], [8, 5], [9, 4], [10, 3]], // negative, none
  },
  {
    id: 'c3',
    x: 'seat row',
    y: 'quiz score',
    pts: [[1, 5], [1, 7], [3, 4], [3, 8], [5, 3], [5, 9], [7, 4], [7, 8], [9, 5], [9, 7]], // exactly zero, none
  },
  {
    id: 'c4',
    x: 'ramp position',
    y: 'roll distance',
    pts: [[3, 3], [4, 8], [5, 11], [6, 12], [7, 11], [8, 8], [9, 3]], // downward parabola, zero trend
  },
  {
    id: 'c5',
    x: 'reading minutes',
    y: 'pages finished',
    pts: [[2, 2], [3, 3], [4, 3], [5, 4], [6, 5], [7, 6], [8, 6], [9, 7], [2, 11]], // positive? outlier at (2,11)
  },
];
function makeCase(prevId) {
  let c;
  do {
    c = DOCKET[Math.floor(Math.random() * DOCKET.length)];
  } while (prevId && c.id === prevId);
  return c;
}
const calibChecks = (kase, assoc, evidence) => {
  if (!kase) return [false, false];
  const truth = assocOf(kase.pts);
  const outs = outliersOf(kase.pts);
  const assocOK = assoc != null && assoc === truth;
  const evidenceOK =
    outs.length === 0 ? evidence === 'none' : evidence != null && evidence !== 'none' && outs.includes(evidence);
  return [assocOK, evidenceOK];
};
const closeness = (kase, assoc, evidence) =>
  Math.round((100 * calibChecks(kase, assoc, evidence).filter(Boolean).length) / 2);
const isCalibrated = (kase, assoc, evidence) => calibChecks(kase, assoc, evidence).every(Boolean);

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; scenes pinned; the reveal lives in
   the feedback.  The distractors are the real beliefs: that the axes alone
   show the pattern, that zero linear trend means no pattern, that the
   outlier is "just the biggest number."
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'One dot, one individual',
    body:
      'Twelve students. Each carries TWO numbers — hours studied, quiz score — and each ' +
      'becomes ONE dot: across for the first number, up for the second. Tap any dot and its ' +
      'two rug marks light up on the axes.',
    data: 'study',
    q: 'What does a single dot on a scatter plot stand for?',
    choices: [
      'One individual, showing both of its measurements at once',
      'One measurement, counted twice',
      'The average of the two variables',
    ],
    answer: 0,
    feedback:
      'One individual, two numbers, one dot — the dot IS the pairing. The marks along each ' +
      'axis (the rugs) are the two old one-variable pictures; the dot is where one student’s ' +
      'pair of marks cross. Nothing is averaged, ever, in this lab.',
  },
  {
    title: 'The rugs are blind',
    body:
      'The trick step. Same twelve students’ numbers — but the PAIRING has been shuffled: ' +
      'every x is still there, every y is still there, so both rugs are IDENTICAL. Flip ' +
      'between the two datasets and watch what survives.',
    data: 'shuffled',
    chips: ['study', 'shuffled'],
    q: 'Both rugs are identical in the two views. What died in the shuffle?',
    choices: [
      'The pairing — and with it the pattern; the rugs alone were blind all along',
      'Some of the students',
      'The larger values',
    ],
    answer: 0,
    feedback:
      'Only the pairing died — no number left, no number changed, both rugs match tick for ' +
      'tick. Yet the climbing cloud is gone. That is the whole reason scatter plots exist: ' +
      'the one-variable views cannot see WHO scored what, and association lives entirely in ' +
      'the pairing.',
  },
  {
    title: 'Positive association',
    body:
      'Back to the true pairing. Read the cloud left to right: students who studied more ' +
      'TENDED to score more. Not a rule — a tendency with exceptions.',
    data: 'study',
    q: 'What does POSITIVE association claim?',
    choices: [
      'As one variable grows, the other TENDS to grow — a drift, not a law',
      'Every extra hour adds exactly one point',
      'The dots form a perfect line',
    ],
    answer: 0,
    feedback:
      'A tendency: the cloud drifts upward as you read rightward. Two students broke the ' +
      'drift and the claim survives — association is about the crowd, not each member. (How ' +
      'strong the drift is, and what line best rides it, is the NEXT bench’s story.)',
  },
  {
    title: 'Negative association',
    body:
      'A new roster: evening screen hours against hours of sleep. The cloud falls as it runs ' +
      'right.',
    data: 'screens',
    q: 'The cloud falls left to right. The association is…',
    choices: [
      'Negative — more screen time tends to go with less sleep',
      'Positive — the dots still line up',
      'Zero — some dots share a height',
    ],
    answer: 0,
    feedback:
      'Negative: growth in one variable rides with decline in the other. Note what the ' +
      'picture does NOT say: it cannot tell you whether screens steal sleep, sleepless kids ' +
      'reach for screens, or something else drives both. The scatter shows the riding, never ' +
      'the reason — hold that thought for the correlation benches.',
  },
  {
    title: 'No association — and the curve that hides',
    body:
      'Two rosters. Shoe size vs quiz score: the cloud just hums — knowing one number tells ' +
      'you nothing about the other. Then launch angle vs distance: the LINEAR trend is ' +
      'exactly zero, and yet…',
    data: 'shoes',
    chips: ['shoes', 'bounce'],
    q: 'The launch-angle cloud has exactly zero linear trend. Is there a pattern?',
    choices: [
      'Yes — a perfect arch: distance rises then falls; “no linear association” is not “no pattern”',
      'No — zero trend means the variables ignore each other',
      'No — the dots are too few to mean anything',
    ],
    answer: 0,
    feedback:
      'A perfect arch — every dot on one parabola, middle angles flying farthest — and still ' +
      'the LINEAR trend computes to exactly zero, because the climb and the fall cancel. ' +
      '"Linear" is a shape of tendency, not the only shape; a flat linear reading can hide a ' +
      'strong curved law. Always look at the cloud before trusting one number about it.',
  },
  {
    title: 'Clusters, and the visitor',
    body:
      'Sprint times and jump heights for two practice squads. The cloud gathers into TWO ' +
      'clumps — and one dot sits far from everybody. The gap rule finds it exactly: its ' +
      'nearest neighbour is more than twice as far as anyone else’s.',
    data: 'teams',
    q: 'What makes the visitor dot an OUTLIER here?',
    choices: [
      'Its distance from every other dot — not the size of its numbers',
      'It has the biggest y-value on the plot',
      'It is the last one in the roster',
    ],
    answer: 0,
    feedback:
      'Distance from the crowd. Its numbers are not extreme one at a time — plenty of dots ' +
      'share its height or its speed — but no dot is NEAR it, and the gap rule (nearest ' +
      'neighbour beyond 4× everyone else’s, squared) certifies it. Clusters say "two kinds ' +
      'of individual"; the outlier says "one of these is not like the others."',
  },
  {
    title: 'The field notebook',
    body:
      'A fresh roster is posted. Describe its association — then rule on the outlier: tap ' +
      'the guilty dot, or enter the plea that none exists.',
    data: 'study',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ScatterPlotLab() {
  const [dataKey, setDataKey] = useState('study');
  const [picked, setPicked] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [kase, setKase] = useState(null);
  const [assoc, setAssoc] = useState(null);
  const [evidence, setEvidence] = useState(null);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const geomRef = useRef([]);

  const current = STEPS[step];
  const calib = !!current.calib;
  const dataset = calib && kase ? kase : DATA[dataKey];

  const checks = calib ? calibChecks(kase, assoc, evidence) : [false, false];
  const pct = calib && kase ? closeness(kase, assoc, evidence) : 0;
  const calibrated = calib && kase ? isCalibrated(kase, assoc, evidence) : false;

  sceneRef.current = { dataset, picked, calib, evidence, step };

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
    const pts = S.dataset.pts;

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
    const padL = 64;
    const padB = 58;
    const padR = 26;
    const padT = 18;
    const plotW = W - padL - padR;
    const plotH = H - bandH - padT - padB;
    const k = Math.min(plotW / 12.8, plotH / 12.8);
    const ox = padL;
    const oy = bandH + padT + plotH;
    const px = (X, Y) => [ox + X * k, oy - Y * k];

    /* axes */
    ctx.strokeStyle = 'rgba(28,43,58,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + 12.6 * k, oy);
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - 12.6 * k);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= 12; v += 2) {
      ctx.fillText(String(v), ox + v * k, oy + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 2; v <= 12; v += 2) {
      ctx.fillText(String(v), ox - 7, oy - v * k);
    }
    /* axis names */
    ctx.fillStyle = INK;
    ctx.font = 'italic 600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(S.dataset.x + ' →', ox + 6.3 * k, oy + 24);
    ctx.save();
    ctx.translate(ox - 40, oy - 6.3 * k);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(S.dataset.y + ' →', 0, 0);
    ctx.restore();

    /* the rugs: one variable alone, on each axis — the blind views */
    for (const [x] of pts) {
      ctx.strokeStyle = 'rgba(63,116,166,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + x * k, oy + 1);
      ctx.lineTo(ox + x * k, oy - 7);
      ctx.stroke();
    }
    for (const [, y] of pts) {
      ctx.strokeStyle = 'rgba(63,116,166,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox - 1, oy - y * k);
      ctx.lineTo(ox + 7, oy - y * k);
      ctx.stroke();
    }

    /* the dots */
    const outs = outliersOf(pts);
    geomRef.current = [];
    pts.forEach(([x, y], i) => {
      const [dx, dy] = px(x, y);
      geomRef.current.push({ dx, dy, i });
      const isOut = outs.includes(i) && (S.step >= 5 || S.calib) && !S.calib; // shown in the lesson, hunted in the capstone
      ctx.fillStyle = isOut ? CARMINE : BLUE;
      ctx.beginPath();
      ctx.arc(dx, dy, 6.6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (S.picked === i || (S.calib && S.evidence === i)) {
        ctx.strokeStyle = GOLD;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(dx, dy, 11.5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    /* the tapped individual: its two rug marks, lit gold */
    if (S.picked != null && pts[S.picked]) {
      const [x, y] = pts[S.picked];
      const [dx, dy] = px(x, y);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ox + x * k, oy + 1);
      ctx.lineTo(ox + x * k, oy - 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox - 1, oy - y * k);
      ctx.lineTo(ox + 9, oy - y * k);
      ctx.stroke();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(185,135,24,0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ox + x * k, oy);
      ctx.lineTo(dx, dy);
      ctx.lineTo(ox, oy - y * k);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ---- the readout band ---- */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (S.calib) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = 'italic 600 14px system-ui, sans-serif';
      ctx.fillText('the field notebook — describe the cloud, then rule on the outlier', W / 2, bandH / 2);
    } else if (S.picked != null && pts[S.picked]) {
      const [x, y] = pts[S.picked];
      ctx.fillStyle = GOLD;
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText(
        `one individual: ${S.dataset.x} ${x}, ${S.dataset.y} ${y} — one dot`,
        W / 2,
        bandH / 2
      );
    } else {
      const a = assocOf(pts);
      const words = {
        positive: 'the cloud climbs — positive association',
        negative: 'the cloud falls — negative association',
        none: 'the cloud hums flat — no association',
        nonlinear: 'zero linear trend — but look: a perfect arch',
      };
      ctx.fillStyle = a === 'none' ? INK_SOFT : CARMINE;
      ctx.font = '600 15.5px system-ui, sans-serif';
      ctx.fillText(words[a] + (outs.length > 0 && S.step >= 5 ? ' · one visitor, far from all' : ''), W / 2, bandH / 2);
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
    setDataKey(STEPS[step].data);
    setPicked(null);
    if (STEPS[step].calib) {
      setKase(makeCase(null));
      setAssoc(null);
      setEvidence(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: tap a dot ------------------------------------------- */
  const onPointerDown = (e) => {
    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const g of geomRef.current) {
      const dx = g.dx - mx;
      const dy = g.dy - my;
      if (dx * dx + dy * dy < 15 * 15) {
        if (calib) setEvidence(g.i);
        else setPicked(g.i === picked ? null : g.i);
        return;
      }
    }
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setPicked(null);
    setAssoc(null);
    setEvidence(null);
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const truthAssoc = assocOf(dataset.pts);
  const spoken = calib
    ? `The field notebook: ${kase ? kase.x + ' against ' + kase.y : ''}, ${dataset.pts.length} individuals. Declared ${
        assoc ?? 'nothing'
      }; evidence ${evidence == null ? 'none yet' : evidence === 'none' ? 'no outlier' : `dot ${evidence + 1}`}. ${
        calibrated ? 'Calibrated.' : ''
      }`
    : `${dataset.label}: ${dataset.pts.length} individuals; association ${truthAssoc}. ${
        picked != null ? `Tapped individual ${picked + 1}: ${dataset.pts[picked][0]}, ${dataset.pts[picked][1]}.` : ''
      }`;

  return (
    <div className="splab">
      <header className="head">
        <h1>The Scatter Plot: The Pairing Is the Picture</h1>
        <p className="lede">
          Two measurements per individual, one dot each. The axes alone are <em>blind</em> —
          shuffle the pairing and the pattern dies with both rugs unchanged. Then read the
          cloud: <span className="mono">climbs · falls · hums · arches</span>, plus the visitor
          no dot sits near.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage" ref={stageRef} role="img" aria-label={spoken} onPointerDown={onPointerDown}>
            <canvas ref={canvasRef} />
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="toolbar" role="group" aria-label="Datasets">
            {current.chips &&
              current.chips.map((dk) => (
                <button
                  type="button"
                  key={dk}
                  className={'chipbtn' + (dataKey === dk ? ' active' : '')}
                  onClick={() => {
                    setDataKey(dk);
                    setPicked(null);
                  }}
                >
                  {DATA[dk].label}
                </button>
              ))}
            <button type="button" className="btn ghost" onClick={reset}>
              Reset
            </button>
            <span className="hint">tap a dot — it is somebody</span>
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
                <span className="target-k">Posted in the notebook</span>
                <span className="target-word">
                  {kase.x} vs {kase.y}
                </span>
                <ol className="tasks">
                  <li className={checks[0] ? 'done' : ''}>{checks[0] ? '✓' : '·'} the association described</li>
                  <li className={checks[1] ? 'done' : ''}>{checks[1] ? '✓' : '·'} the outlier ruling</li>
                </ol>
                <div className="declare" role="group" aria-label="Association">
                  {['positive', 'negative', 'none', 'nonlinear'].map((a) => (
                    <button
                      type="button"
                      key={a}
                      className={'declbtn' + (assoc === a ? ' active' : '')}
                      onClick={() => setAssoc(a)}
                    >
                      {a}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={'declbtn' + (evidence === 'none' ? ' active' : '')}
                    onClick={() => setEvidence('none')}
                  >
                    no outlier
                  </button>
                </div>
                <span className="target-hint mono">
                  {calibrated
                    ? 'noted — a clean page in the field book'
                    : assoc == null
                      ? 'describe the cloud first'
                      : 'now the outlier: tap it, or enter the plea'}
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
                  <span className="mono target-hint">the cloud · then the visitor</span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setKase(makeCase(kase.id));
                  setAssoc(null);
                  setEvidence(null);
                }}
              >
                Next page
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
                  setAssoc(null);
                  setEvidence(null);
                  setDataKey('study');
                  setPicked(null);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">climbs · falls · hums · arches</span> &nbsp;·&nbsp; a scatter
        plot pairs two measurements per individual; association, clusters and outliers are
        properties of the pairing (CCSS 8.SP.A.1). No line is drawn through the cloud here —
        fitting one is the next bench’s story.
      </footer>

      <style jsx>{`
        .splab {
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
          font: 700 12.5px/1 system-ui, sans-serif;
          padding: 8px 11px;
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
        :global(.splab) :focus-visible {
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
