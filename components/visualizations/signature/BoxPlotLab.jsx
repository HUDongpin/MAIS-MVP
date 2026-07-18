'use client';

/* ============================================================================
   BoxPlotLab — an interactive "bench" for the FIVE-NUMBER SUMMARY and the BOX
   PLOT.  It is the sequel to the Median lab, and it reuses the median's central
   move — the two-ended PINCER — RECURSIVELY:

       1. Run the pincer on the whole set  → the MEDIAN (Q2).
       2. Run the pincer on the LOWER half → Q1 (the first quartile).
       3. Run the pincer on the UPPER half → Q3 (the third quartile).

   Those three cuts, together with the min and the max, are the FIVE-NUMBER
   SUMMARY (min · Q1 · median · Q3 · max), and drawing them on a number line
   gives the BOX PLOT: a box from Q1 to Q3 (the middle 50% of the data), a line
   at the median, and whiskers out to the extremes.  The box's width is the
   INTERQUARTILE RANGE, IQR = Q3 − Q1 — a measure of spread that, like the
   median, barely flinches at an outlier.  A value more than 1.5·IQR outside the
   box is flagged as an outlier, and the whisker stops at the last value inside
   that fence.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 6–8 and
   up (CCSS 6.SP.B.4 "display numerical data in box plots", 6.SP.B.5.c "summarize
   with quartiles and interquartile range"; extends to HS S-ID.A.1/A.2/A.3 —
   compare center and spread, account for outliers).  It is a DISTINCT companion
   to the Median lab: Median owns the single middle and the 50/50 split; BoxPlot
   owns the FOUR-way split, the five-number summary, the IQR as a robust spread,
   and the box-and-whisker DIAGRAM — a display neither the Median nor the Data lab
   can make.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Two (and
   at the end three) linked pictures of one data set:
     • the DOT PLOT (top) — value on a number line, one stacked dot per point;
       where the data is built, and where faint carmine guides drop down from the
       quartiles once they are found.
     • the BOX PLOT (below the same axis) — the box Q1→Q3 with the median line and
       whiskers, aligned to the very same scale so the box sits under the data it
       summarizes.  This is the payoff diagram.
     • the SORTED ROW (revealed with the order lens) — ordered tiles with the
       RECURSIVE pincer: it converges to the median, then two half-pincers
       converge to Q1 and Q3.

   One-accent discipline: CARMINE is the mathematical object the lab reveals — the
   BOX PLOT / five-number summary (the box, the median line, the Q1·Q2·Q3 cuts,
   the pincer, the IQR bracket).  Everything secondary keeps a quiet hue: the
   whiskers and min/max are ink, the 1.5·IQR fences are slate dashed, outliers are
   a hollow carmine ring (still the data's story).  Green is reserved for
   "correct" and "CALIBRATED".

   All statistics are EXACT integer arithmetic, so a K-12 student never meets a
   float artefact:
     • data values are integers 0…10.
     • the median, Q1, and Q3 are each the median of a range, kept as an exact
       ratio {num, den} with den ∈ {1, 2} — a whole number or a clean ".5".
     • IQR = Q3 − Q1 is exact in half-units (2·IQR is an integer).
     • the 1.5·IQR fences are exact in quarter-units (4·fence is an integer), so
       outlier detection is an exact integer comparison, never a float threshold.

   Quartile convention: the "exclusive" / Tukey method used across US K-12 (and by
   Khan Academy): the median splits the data into a lower and an upper half, and
   when n is ODD the median value is EXCLUDED from both halves.  Q1 is the median
   of the lower half; Q3 the median of the upper half.  This is exactly what the
   RECURSIVE pincer computes, which is why the two ideas fit together so cleanly.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/BoxPlotLab.jsx
     2. Import and render it:
          import BoxPlotLab from './BoxPlotLab';
          export default function Page() { return <BoxPlotLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. Data is built by clicking a 0–10 integer number line; the
   "dials" are LENSES that unlock one per lesson step.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 10;
const MAX_POINTS = 12;
const MAX_STACK = 8;

// a friendly starting set: n=8, clean five-number summary (2 · 3.5 · 5.5 · 7.5 · 9)
const START_DATA = [2, 3, 4, 5, 6, 7, 8, 9];

const STEP_DATA = 0; // meet data — build a dot plot
const STEP_MEDIAN = 1; // the median = Q2 (the pincer, once)
const STEP_QUARTILES = 2; // quartiles — the pincer on each half → Q1, Q3
const STEP_FIVE = 3; // the five-number summary
const STEP_BOX = 4; // the box plot
const STEP_IQR = 5; // IQR + the 1.5·IQR outlier rule
const STEP_CALIB = 6; // build a set to match a target box (calibration)

const LENSES = [
  { key: 'order', unlock: STEP_MEDIAN, color: '#5b6b7b', name: 'Sorted row', role: 'the pincer, recursively' },
  { key: 'quart', unlock: STEP_QUARTILES, color: '#c81e4f', name: 'Quartiles', role: 'Q1 · median · Q3' },
  { key: 'box', unlock: STEP_BOX, color: '#c81e4f', name: 'Box plot', role: 'box + whiskers' },
  { key: 'iqr', unlock: STEP_IQR, color: '#3f74a6', name: 'IQR & outliers', role: 'middle 50% + fences' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. The five-number summary and the box, EXACT. Nothing knows a
   pixel.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
// the median of a sorted sub-range [lo..hi] as an exact ratio + the surviving
// middle index/indices — the same rule the pincer converges to.
function medianOfRange(sorted, lo, hi) {
  if (hi < lo) return { num: 0, den: 1, idx: [] };
  const len = hi - lo + 1;
  if (len % 2) {
    const m = lo + (len - 1) / 2;
    return { num: sorted[m], den: 1, idx: [m] };
  }
  const a = lo + len / 2 - 1;
  return { num: sorted[a] + sorted[a + 1], den: 2, idx: [a, a + 1] };
}
// a median-ratio (den ∈ {1,2}) as text: integer or clean ".5"
function fmtQ(num, den) {
  if (den === 1) return String(num);
  const whole = Math.floor(num / 2);
  return num % 2 ? whole + '.5' : String(whole);
}
// a value carried in HALF-units (twice the value) as text: integer or ".5"
function fmtHalf(x2) {
  const whole = Math.floor(x2 / 2);
  return x2 % 2 ? whole + '.5' : String(whole);
}

// Everything the box plot needs, EXACT.  Quartiles by the exclusive method:
// the median splits the sorted data into halves (median excluded when n is odd),
// Q1 = median of the lower half, Q3 = median of the upper half.
function computeBox(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const minV = n ? sorted[0] : 0;
  const maxV = n ? sorted[n - 1] : 0;

  const med = n ? medianOfRange(sorted, 0, n - 1) : { num: 0, den: 1, idx: [] };
  // half boundaries (exclusive method)
  let lowerLo = 0,
    lowerHi = -1,
    upperLo = 0,
    upperHi = -1;
  if (n >= 2) {
    if (med.den === 1) {
      // odd n: exclude the single median at med.idx[0]
      lowerLo = 0;
      lowerHi = med.idx[0] - 1;
      upperLo = med.idx[0] + 1;
      upperHi = n - 1;
    } else {
      // even n: the two middles split the halves cleanly
      lowerLo = 0;
      lowerHi = med.idx[0];
      upperLo = med.idx[1];
      upperHi = n - 1;
    }
  }
  const q1 = lowerHi >= lowerLo ? medianOfRange(sorted, lowerLo, lowerHi) : med;
  const q3 = upperHi >= upperLo ? medianOfRange(sorted, upperLo, upperHi) : med;

  // exact values in HALF-units (den ∈ {1,2} ⇒ 2·value is an integer)
  const q1_2 = (2 * q1.num) / q1.den;
  const med_2 = (2 * med.num) / med.den;
  const q3_2 = (2 * q3.num) / q3.den;
  const iqr2 = q3_2 - q1_2; // = 2·IQR, integer

  // 1.5·IQR fences in QUARTER-units (4·fence is an integer):
  //   lowerFence = Q1 − 1.5·IQR  ⇒  4·lowerFence = 2·q1_2 − 3·iqr2
  const loFence4 = 2 * q1_2 - 3 * iqr2;
  const hiFence4 = 2 * q3_2 + 3 * iqr2;

  // modified whiskers + outliers (exact integer comparison, 4·v vs 4·fence)
  const outliers = [];
  let loWhisker = minV;
  let hiWhisker = maxV;
  if (n > 0) {
    let lw = null;
    let hw = null;
    for (const v of sorted) {
      const v4 = 4 * v;
      if (v4 < loFence4 || v4 > hiFence4) {
        outliers.push(v);
      } else {
        if (lw === null) lw = v; // smallest non-outlier
        hw = v; // largest non-outlier (sorted ⇒ last one wins)
      }
    }
    loWhisker = lw === null ? minV : lw;
    hiWhisker = hw === null ? maxV : hw;
  }

  // pincer depths
  const maxPeel = n > 0 ? Math.floor((n - 1) / 2) : 0; // outer → median
  const halfLen = lowerHi - lowerLo + 1; // both halves share this length
  const maxPeelQ = halfLen > 0 ? Math.floor((halfLen - 1) / 2) : 0; // → Q1/Q3

  return {
    n,
    sorted,
    minV,
    maxV,
    med,
    q1,
    q3,
    lowerLo,
    lowerHi,
    upperLo,
    upperHi,
    q1_2,
    med_2,
    q3_2,
    iqr2,
    loFence4,
    hiFence4,
    loWhisker,
    hiWhisker,
    outliers,
    maxPeel,
    maxPeelQ,
    halfLen,
  };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL: a grey ghost BOX (target Q1, median,
   Q3) is fixed on the number line; build ANY data set (≥ 4 dots) whose carmine
   box matches it — same Q1, same median, same Q3.  Many sets win (the whiskers
   may differ), which is the point.  The meter reads the total gap between your
   box edges and the target's; CALIBRATED is an EXACT hit, checked in half-units.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 6; // value-units of total edge-gap across the meter
function matchPercent(box, exists, T) {
  if (!exists || !T) return 0;
  const d2 = Math.abs(box.q1_2 - 2 * T.q1) + Math.abs(box.med_2 - 2 * T.med) + Math.abs(box.q3_2 - 2 * T.q3);
  return 100 * Math.max(0, 1 - d2 / 2 / MATCH_SCALE);
}
const isCalibrated = (box, n, T) =>
  n >= 4 && !!T && box.q1_2 === 2 * T.q1 && box.med_2 === 2 * T.med && box.q3_2 === 2 * T.q3;

// a canonical set achieving (q1,med,q3): {q1×3, med, q3×3} — n=7, exclusive method
const solutionFor = (T) => [T.q1, T.q1, T.q1, T.med, T.q3, T.q3, T.q3];

function makeTarget(prev) {
  let t;
  let guard = 0;
  do {
    const q1 = 1 + Math.floor(Math.random() * 4); // 1..4
    const med = q1 + 1 + Math.floor(Math.random() * 3); // q1+1 .. q1+3
    const q3 = med + 1 + Math.floor(Math.random() * 3); // med+1 .. med+3
    t = { q1, med, q3 };
    guard++;
  } while (guard < 50 && (t.q3 > VMAX || (prev && prev.q1 === t.q1 && prev.med === t.med && prev.q3 === t.q3)));
  if (t.q3 > VMAX) t = { q1: 2, med: 5, q3: 8 };
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The five-number summary is the star: min · Q1 ·
   median · Q3 · max, with the BOX part (Q1..Q3) in the carmine accent and the
   whiskers (min/max) in ink, plus a carmine IQR chip.  A CHILD component, so
   styles are INLINED (styled-jsx only scopes a component's own JSX).
   ------------------------------------------------------------------------- */
const CHIP = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function BoxEquation({ exists, n, minV, q1Str, medStr, q3Str, maxV, iqrStr, showIqr }) {
  const num = (v, color) => (
    <span style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontVariantNumeric: 'tabular-nums', fontSize: '22px', fontWeight: 700, color }}>
      {v}
    </span>
  );
  const dot = <span style={{ color: '#9aa7b2', fontSize: '15px', padding: '0 2px' }}>·</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
        {exists ? (
          <>
            {num(minV, '#1c2b3a')}
            {dot}
            {num(q1Str, '#c81e4f')}
            {dot}
            {num(medStr, '#c81e4f')}
            {dot}
            {num(q3Str, '#c81e4f')}
            {dot}
            {num(maxV, '#1c2b3a')}
          </>
        ) : (
          num('—', '#c81e4f')
        )}
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#5b6b7b', letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: '6px' }}>
          5-number
        </span>
      </span>
      <span style={{ ...CHIP, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
      {showIqr && exists && (
        <span style={{ ...CHIP, color: '#c81e4f', background: 'rgba(200,30,79,0.12)' }}>IQR = {iqrStr}</span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the lens unlocks with the step; the reveal
   lives in `feedback`; distractors are real box-plot misconceptions. Next is
   gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the data — build a dot plot',
    body:
      'A data set has a center AND a spread. The median gives the center; to describe the SPREAD we ' +
      'will cut the data into four parts using QUARTILES, then draw a box plot. Click the number line ' +
      'to drop a dot for each value; click a dot to remove it, or drag it to a new value.',
    q: 'The median tells you the center of the data. What do we still need to describe?',
    choices: [
      'How SPREAD OUT the data is — where the middle group sits and how wide it is',
      'Only the single largest value',
      'The value that appears most often',
    ],
    answer: 0,
    feedback:
      'Two data sets can share a median but be spread very differently. To capture spread we find the ' +
      'quartiles — the cuts at 25%, 50%, and 75% — and measure the width of the middle group. That is ' +
      'what a box plot shows.',
  },
  {
    title: 'The median is Q2 — split the data in half',
    body:
      'Start with the median (also called Q2, the second quartile). Order the values and run the ' +
      'PINCER — cross out the smallest and largest together until the middle is left. The median ' +
      'splits the ordered data into a LOWER half and an UPPER half with equal counts. Use the pincer ' +
      'buttons below, or “Find all”.',
    q: 'The median splits the ordered data into…',
    choices: [
      'A lower half and an upper half, with equal counts on each side',
      'Two halves of equal WIDTH on the number line',
      'The most common value and everything else',
    ],
    answer: 0,
    feedback:
      'The median is the positional center: half the values fall below it, half above. Those two ' +
      'halves are exactly what we quarter next — the median is the hinge the whole box plot turns on.',
  },
  {
    title: 'Quartiles — run the pincer on each half',
    body:
      'Here is the trick: do the SAME move again, on each half. Q1 (the first quartile) is the median ' +
      'of the LOWER half; Q3 (the third quartile) is the median of the UPPER half. Keep stepping the ' +
      'pincer — now two of them, one per half — until Q1 and Q3 are left. Three cuts, Q1 · Q2 · Q3, ' +
      'split the data into four parts.',
    q: 'How do you find Q1, the first quartile?',
    choices: [
      'Take the median of the LOWER half of the data',
      'Take the value one quarter of the way along the number line',
      'Divide the smallest value by four',
    ],
    answer: 0,
    feedback:
      'Q1 is just a median again — the median of the lower half. Q3 is the median of the upper half. ' +
      '(When the count is odd, the overall median is left out of both halves.) The quartile is about ' +
      'POSITION in the data, not distance along the axis.',
  },
  {
    title: 'The five-number summary',
    body:
      'Now we have five landmarks that summarize the whole data set: the MINIMUM, Q1, the MEDIAN, Q3, ' +
      'and the MAXIMUM. Together they are the FIVE-NUMBER SUMMARY. They split the data into four ' +
      'parts, each holding about a quarter of the values — the two inner parts (Q1 to Q3) are the ' +
      'middle half.',
    q: 'The five-number summary of a data set is…',
    choices: [
      'Minimum, Q1, median, Q3, maximum',
      'Mean, median, mode, range, and count',
      'The five most common values',
    ],
    answer: 0,
    feedback:
      'Minimum · Q1 · median · Q3 · maximum. Five numbers pin down where the data starts, where its ' +
      'middle half sits, and where it ends — enough to draw the whole box plot.',
  },
  {
    title: 'The box plot',
    body:
      'Draw the five numbers on the axis. The BOX stretches from Q1 to Q3 — the middle 50% of the ' +
      'data — with a line at the median. The WHISKERS reach out to the minimum and maximum. That is a ' +
      'box-and-whisker plot: a compact picture of center and spread you can compare at a glance.',
    q: 'On a box plot, the BOX stretches from…',
    choices: [
      'Q1 to Q3 — the middle half of the data',
      'The minimum to the maximum — all of the data',
      'The mean minus one to the mean plus one',
    ],
    answer: 0,
    feedback:
      'The box spans Q1 to Q3, so it contains the middle 50% of the values; the line inside is the ' +
      'median. The whiskers, not the box, reach the extremes. A short box means the middle half is ' +
      'tightly packed; a long box means it is spread out.',
  },
  {
    title: 'IQR and outliers',
    body:
      'The width of the box is the INTERQUARTILE RANGE: IQR = Q3 − Q1, the spread of the middle 50%. ' +
      'Like the median, it ignores the extremes, so it resists outliers. A common rule flags a value ' +
      'as an OUTLIER if it lies more than 1.5 × IQR beyond the box (the dashed fences). The whisker ' +
      'then stops at the last value inside the fence, and outliers are drawn as separate points. Try ' +
      'the “Outlier” preset.',
    q: 'What does the IQR (interquartile range) measure?',
    choices: [
      'The spread of the middle 50% of the data: Q3 − Q1',
      'The distance from the smallest value to the largest',
      'The average of Q1 and Q3',
    ],
    answer: 0,
    feedback:
      'IQR = Q3 − Q1 is the width of the box — how spread out the middle half is. Because it throws ' +
      'away the top and bottom quarters, one runaway value barely changes it, which is why the IQR (and ' +
      'the median) are used to describe skewed data like incomes.',
  },
  {
    title: 'Build a box to match',
    body:
      'Final challenge. A grey target box is fixed on the axis — a target Q1, median, and Q3. Build a ' +
      'data set (at least 4 dots) whose carmine box matches it: same Q1, same median, same Q3. There ' +
      'are MANY winning sets (the whiskers can differ). The meter reads CALIBRATED when all three cuts ' +
      'line up. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function BoxPlotLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [target, setTarget] = useState(null); // {q1, med, q3} during calibration
  const [peel, setPeel] = useState(0); // outer pincer → median
  const [peelQ, setPeelQ] = useState(0); // half pincers → Q1, Q3
  const [lensOn, setLensOn] = useState({ order: false, quart: false, box: false, iqr: false });

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({});
  const sceneRef = useRef({});
  const dataRef = useRef(data);
  const grabRef = useRef(null);
  const hoverColRef = useRef(null);

  dataRef.current = data;

  const current = STEPS[step];
  const calib = !!current.calib;

  const bx = computeBox(data);
  const { n, sorted, minV, maxV, med, q1, q3, maxPeel, maxPeelQ, iqr2 } = bx;
  const exists = n > 0;

  const peelC = Math.max(0, Math.min(peel, maxPeel));
  const outerDone = peelC >= maxPeel;
  const peelQC = Math.max(0, Math.min(peelQ, maxPeelQ));
  const quartDone = outerDone && peelQC >= maxPeelQ;

  const q1Str = exists ? fmtQ(q1.num, q1.den) : '—';
  const medStr = exists ? fmtQ(med.num, med.den) : '—';
  const q3Str = exists ? fmtQ(q3.num, q3.den) : '—';
  const iqrStr = exists ? fmtHalf(iqr2) : '—';

  const eff = {
    order: lensOn.order && step >= STEP_MEDIAN,
    quart: lensOn.quart && step >= STEP_QUARTILES,
    box: lensOn.box && step >= STEP_BOX,
    iqr: lensOn.iqr && step >= STEP_IQR,
  };
  const showStrip = eff.order;
  const showBox = eff.box;

  const matchPct = calib && target ? matchPercent(bx, exists, target) : 0;
  const calibrated = calib && target ? isCalibrated(bx, n, target) : false;

  sceneRef.current = {
    data,
    n,
    sorted,
    minV,
    maxV,
    med,
    q1,
    q3,
    bx,
    eff,
    showStrip,
    showBox,
    peel: peelC,
    peelQ: peelQC,
    outerDone,
    quartDone,
    calib,
    target,
    calibrated,
    q1Str,
    medStr,
    q3Str,
    iqrStr,
  };

  /* ---- value → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F'; // the BOX PLOT — box, median line, cuts, pincer, IQR
    const CARM_SOFT = 'rgba(200,30,79,0.10)';
    const SLATE = '#5B6B7B'; // fences
    const DOT = 'rgba(28,43,58,0.78)';
    const AXIS = 'rgba(28,43,58,0.55)';

    const S = sceneRef.current;
    ctx.clearRect(0, 0, Wd, Hd);

    /* quadrille backdrop */
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,216,228,0.5)';
    ctx.beginPath();
    for (let gx = 0; gx <= Wd; gx += 22) {
      const X = Math.round(gx) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, Hd);
    }
    for (let gy = 0; gy <= Hd; gy += 22) {
      const Y = Math.round(gy) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(Wd, Y);
    }
    ctx.stroke();

    const padL = 34;
    const padR = 24;
    const spanW = Wd - padL - padR;
    const xOf = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;
    const cellW = spanW / (VMAX - VMIN);

    const plotTop = 30;
    // dot-plot number line: sits higher when the box plot and/or strip are shown
    const baseY = S.showStrip ? Math.round(Hd * 0.34) : S.showBox ? Math.round(Hd * 0.46) : Math.round(Hd * 0.62);

    /* caption */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dot plot — each dot is one data point', padL, 8);

    /* number line + ticks */
    ctx.strokeStyle = AXIS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL - 6, baseY + 0.5);
    ctx.lineTo(Wd - padR + 6, baseY + 0.5);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = VMIN; v <= VMAX; v++) {
      const X = xOf(v);
      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, baseY - 4);
      ctx.lineTo(X + 0.5, baseY + 5);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText(String(v), X, baseY + 8);
    }

    /* dot geometry */
    const availStackH = baseY - plotTop - 8;
    const step0 = availStackH / MAX_STACK;
    let dotR = Math.min(cellW * 0.36, step0 * 0.46, 11);
    dotR = Math.max(4.5, dotR);
    const colCount = new Map();
    const dots = [];
    S.data.forEach((v, i) => {
      const j = colCount.get(v) || 0;
      colCount.set(v, j + 1);
      dots.push({ i, x: xOf(v), y: baseY - 8 - dotR - j * step0, r: dotR, val: v });
    });

    // hovered add-column
    if (S.hoverCol != null) {
      const X = xOf(S.hoverCol);
      ctx.fillStyle = 'rgba(63,116,166,0.12)';
      ctx.fillRect(X - cellW / 2, plotTop, cellW, baseY - plotTop);
    }

    /* ---- QUARTILE guide lines up through the dot plot (quart lens) --------- */
    const drawGuide = (val, label, emph) => {
      const X = xOf(val);
      ctx.save();
      ctx.strokeStyle = emph ? CARMINE : 'rgba(200,30,79,0.5)';
      ctx.lineWidth = emph ? 2.2 : 1.4;
      if (!emph) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 2);
      ctx.lineTo(X, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, X, plotTop + 1);
      ctx.restore();
    };
    if (S.eff.quart && S.n > 0) {
      drawGuide(S.q1.num / S.q1.den, 'Q1', false);
      drawGuide(S.med.num / S.med.den, 'med', true);
      drawGuide(S.q3.num / S.q3.den, 'Q3', false);
    }

    /* ---- the dots --------------------------------------------------------- */
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = DOT;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(251,251,248,0.9)';
      ctx.stroke();
    }

    // empty-state prompt
    if (S.n === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click the number line to add data points', (padL + Wd - padR) / 2, (plotTop + baseY) / 2);
    }

    /* =================== BOX PLOT (below the axis) ======================== */
    let boxBottom = baseY;
    if (S.showBox && S.n > 0) {
      const B = S.bx;
      const withFences = S.eff.iqr;
      const boxTop = baseY + 40; // sits clear of the axis + tick labels
      const boxH = 28;
      const boxCy = boxTop + boxH / 2;

      const xQ1 = xOf(B.q1.num / B.q1.den);
      const xMed = xOf(B.med.num / B.med.den);
      const xQ3 = xOf(B.q3.num / B.q3.den);
      const loEnd = withFences ? B.loWhisker : B.minV;
      const hiEnd = withFences ? B.hiWhisker : B.maxV;
      const xLo = xOf(loEnd);
      const xHi = xOf(hiEnd);

      // 1.5·IQR fences (iqr lens) — slate dashed verticals (drawn first, behind)
      if (withFences) {
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.85)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 3]);
        for (const fv of [B.loFence4 / 4, B.hiFence4 / 4]) {
          if (fv < VMIN - 0.4 || fv > VMAX + 0.4) continue;
          const X = xOf(fv);
          ctx.beginPath();
          ctx.moveTo(X, boxTop - 14);
          ctx.lineTo(X, boxCy + boxH / 2 + 6);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.fillStyle = SLATE;
        ctx.font = '600 9px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // one short label, centred over the box, naming the dashed lines
        ctx.fillText('1.5·IQR fences', xMed, boxTop - 16);
        ctx.restore();
      }

      // whiskers + caps
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xLo, boxCy);
      ctx.lineTo(xQ1, boxCy);
      ctx.moveTo(xQ3, boxCy);
      ctx.lineTo(xHi, boxCy);
      ctx.moveTo(xLo, boxCy - 8);
      ctx.lineTo(xLo, boxCy + 8);
      ctx.moveTo(xHi, boxCy - 8);
      ctx.lineTo(xHi, boxCy + 8);
      ctx.stroke();

      // the box Q1..Q3
      ctx.fillStyle = CARM_SOFT;
      ctx.fillRect(xQ1, boxTop, Math.max(1, xQ3 - xQ1), boxH);
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(xQ1 + 0.5, boxTop + 0.5, Math.max(1, xQ3 - xQ1) - 1, boxH - 1);

      // median line inside the box (heavier)
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xMed, boxTop - 2);
      ctx.lineTo(xMed, boxTop + boxH + 2);
      ctx.stroke();

      // outlier points beyond the whiskers (iqr lens): hollow carmine rings + value
      if (withFences) {
        for (const ov of B.outliers) {
          const X = xOf(ov);
          ctx.beginPath();
          ctx.arc(X, boxCy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = CARMINE;
          ctx.font = '700 9px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(ov), X, boxCy + 8);
        }
      }

      // whisker-end labels: the value where each whisker STOPS. With outliers the
      // whisker ends at the last value inside the fence, not the min/max — so we
      // only write "min"/"max" when the whisker actually reaches them.
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 9.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labY = boxTop + boxH + 5;
      ctx.fillText((loEnd === B.minV ? 'min ' : '') + loEnd, xLo, labY);
      ctx.fillText((hiEnd === B.maxV ? 'max ' : '') + hiEnd, xHi, labY);

      // IQR bracket BELOW the box (iqr lens): the box's width IS the IQR
      boxBottom = labY + 14;
      if (withFences) {
        const brY = labY + 16;
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xQ1, brY);
        ctx.lineTo(xQ1, brY + 5);
        ctx.lineTo(xQ3, brY + 5);
        ctx.lineTo(xQ3, brY);
        ctx.stroke();
        ctx.fillStyle = CARMINE;
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('IQR = ' + S.iqrStr, (xQ1 + xQ3) / 2, brY + 7);
        boxBottom = brY + 20;
      }
    }

    /* ---- calibration ghost target box ------------------------------------ */
    if (S.calib && S.target) {
      const T = S.target;
      const gy = baseY + 40; // aligns with the live box (boxTop) so a match overlaps
      const gh = 28;
      const xtQ1 = xOf(T.q1);
      const xtMed = xOf(T.med);
      const xtQ3 = xOf(T.q3);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.85)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.8;
      ctx.strokeRect(xtQ1 + 0.5, gy + 0.5, Math.max(1, xtQ3 - xtQ1) - 1, gh - 1);
      ctx.beginPath();
      ctx.moveTo(xtMed, gy);
      ctx.lineTo(xtMed, gy + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target box', (xtQ1 + xtQ3) / 2, gy - 2);
      ctx.restore();
      boxBottom = Math.max(boxBottom, gy + gh + 8);
    }

    /* =================== SORTED ROW + RECURSIVE PINCER =================== */
    if (S.showStrip && S.n > 0) {
      const B = S.bx;
      const capY = (S.showBox || S.calib ? boxBottom : baseY) + 20;
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const capText = !S.outerDone
        ? 'sorted — pincer to the median (cross out smallest & largest)'
        : !S.quartDone
        ? 'now pincer each half — lower half → Q1, upper half → Q3'
        : 'Q1 · median · Q3 split the data into four quarters';
      ctx.fillText(capText, padL, capY);

      const stripPadL = padL;
      const stripSpanW = Wd - padL - padR;
      const slotW = stripSpanW / S.n;
      const tileW = Math.min(slotW * 0.84, 46);
      const tileH = Math.min(tileW, 40);
      const rr = 7;
      const rowCy = capY + 28 + tileH / 2;
      const underY = rowCy + tileH / 2 + 9;
      const tileX = (i) => stripPadL + slotW * (i + 0.5);

      const oddMed = B.med.den === 1; // odd n → the single median tile is EXCLUDED from both halves
      const medTile = oddMed ? B.med.idx[0] : -1;
      const q1Set = new Set(B.q1.idx);
      const q3Set = new Set(B.q3.idx);

      // decide each tile's state
      const isRemoved = (i) => {
        if (!S.outerDone) {
          return i < S.peel || i > S.n - 1 - S.peel;
        }
        // median found. ODD n: the single median tile stays (excluded from halves).
        // EVEN n: the two central tiles BELONG to the halves and get pincered away
        // to reveal Q1/Q3 — the median (a ".5") falls in the gap between them.
        if (i === medTile) return false;
        if (i >= B.lowerLo && i <= B.lowerHi) {
          return i < B.lowerLo + S.peelQ || i > B.lowerHi - S.peelQ;
        }
        if (i >= B.upperLo && i <= B.upperHi) {
          return i < B.upperLo + S.peelQ || i > B.upperHi - S.peelQ;
        }
        return false;
      };
      const isSurvivor = (i) => {
        if (!S.outerDone) return false;
        if (i === medTile) return true; // odd median is a real data value → survivor
        if (S.quartDone && (q1Set.has(i) || q3Set.has(i))) return true;
        return false;
      };

      for (let i = 0; i < S.n; i++) {
        const cx = tileX(i);
        const removed = isRemoved(i);
        const survivor = isSurvivor(i);
        const x0 = cx - tileW / 2;
        const y0 = rowCy - tileH / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + rr, y0);
        ctx.arcTo(x0 + tileW, y0, x0 + tileW, y0 + tileH, rr);
        ctx.arcTo(x0 + tileW, y0 + tileH, x0, y0 + tileH, rr);
        ctx.arcTo(x0, y0 + tileH, x0, y0, rr);
        ctx.arcTo(x0, y0, x0 + tileW, y0, rr);
        ctx.closePath();
        if (survivor) {
          ctx.fillStyle = CARMINE;
          ctx.fill();
        } else if (removed) {
          ctx.fillStyle = 'rgba(28,43,58,0.05)';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(28,43,58,0.18)';
          ctx.stroke();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgba(28,43,58,0.35)';
          ctx.stroke();
        }
        ctx.font = '700 14px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = survivor ? '#fff' : removed ? 'rgba(28,43,58,0.4)' : INK;
        ctx.fillText(String(B.sorted[i]), cx, rowCy + 0.5);
        if (removed) {
          ctx.strokeStyle = 'rgba(200,30,79,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0 + 4, rowCy);
          ctx.lineTo(x0 + tileW - 4, rowCy);
          ctx.stroke();
        }
      }

      // pincer jaws — outer (find median) or the two half-pincers (find Q1/Q3)
      const jawY = rowCy - tileH / 2 - 11;
      const drawJaw = (i, dir) => {
        const cx = tileX(i) - dir * (tileW / 2 + 6);
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.moveTo(cx, jawY - 5);
        ctx.lineTo(cx + dir * 8, jawY);
        ctx.lineTo(cx, jawY + 5);
        ctx.closePath();
        ctx.fill();
      };
      if (!S.outerDone && S.n > 1) {
        drawJaw(S.peel, 1);
        drawJaw(S.n - 1 - S.peel, -1);
      } else if (S.outerDone && !S.quartDone) {
        if (B.lowerHi >= B.lowerLo) {
          drawJaw(B.lowerLo + S.peelQ, 1);
          drawJaw(B.lowerHi - S.peelQ, -1);
        }
        if (B.upperHi >= B.upperLo) {
          drawJaw(B.upperLo + S.peelQ, 1);
          drawJaw(B.upperHi - S.peelQ, -1);
        }
      }

      // median divider for EVEN n — the median falls between the two central tiles
      const medX = oddMed ? tileX(medTile) : (tileX(B.med.idx[0]) + tileX(B.med.idx[1])) / 2;
      if (S.outerDone && !oddMed && B.med.idx.length === 2) {
        ctx.save();
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(medX, rowCy - tileH / 2 - 4);
        ctx.lineTo(medX, rowCy + tileH / 2 + 4);
        ctx.stroke();
        ctx.restore();
      }

      // survivor callouts once quartiles are found
      if (S.quartDone) {
        ctx.fillStyle = CARMINE;
        ctx.font = '700 10.5px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const centerOf = (idx) => idx.map(tileX).reduce((a, b) => a + b, 0) / idx.length;
        if (B.q1.idx.length) ctx.fillText('Q1 ' + S.q1Str, centerOf(B.q1.idx), underY);
        ctx.fillText('med ' + S.medStr, medX, underY);
        if (B.q3.idx.length) ctx.fillText('Q3 ' + S.q3Str, centerOf(B.q3.idx), underY);
      }
    }

    geoRef.current = { padL, spanW, baseY, plotTop, cellW, dotR, dots };
  }, []);

  useEffect(() => {
    draw();
  }, [data, step, target, lensOn, peel, peelQ, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  // unlock the lens that this step introduces
  useEffect(() => {
    const l = LENSES.find((x) => x.unlock === step);
    if (l) setLensOn((prev) => (prev[l.key] ? prev : { ...prev, [l.key]: true }));
  }, [step]);

  // editing the data reshuffles the order — reset both pincers
  useEffect(() => {
    setPeel(0);
    setPeelQ(0);
  }, [data]);

  // set up the calibration target the first time we reach it; start empty
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setData([]);
      setLensOn((prev) => ({ ...prev, quart: true, box: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  sceneRef.current.hoverCol = hoverColRef.current;

  /* ---- interaction: click to add, click a dot to remove, drag to move ---- */
  const clampVal = (v) => Math.max(VMIN, Math.min(VMAX, v));
  const valAtX = (cssX) => {
    const g = geoRef.current;
    if (!g.spanW) return VMIN;
    return clampVal(Math.round(VMIN + ((cssX - g.padL) / g.spanW) * (VMAX - VMIN)));
  };
  const hitDot = (cssX, cssY) => {
    const g = geoRef.current;
    if (!g.dots) return null;
    let best = null;
    let bestD = Infinity;
    for (const d of g.dots) {
      const dd = Math.hypot(cssX - d.x, cssY - d.y);
      if (dd <= d.r + 4 && dd < bestD) {
        best = d;
        bestD = dd;
      }
    }
    return best;
  };
  const countOf = (arr, v) => arr.reduce((c, x) => c + (x === v ? 1 : 0), 0);

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g.spanW) return;
    const hit = hitDot(cssX, cssY);
    if (hit) {
      grabRef.current = { i: hit.i, startVal: hit.val, moved: false };
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (cssY > g.plotTop - 6 && cssY < g.baseY + 6 && cssX > g.padL - g.cellW && cssX < g.padL + g.spanW + g.cellW) {
      const v = valAtX(cssX);
      setData((arr) => (arr.length < MAX_POINTS && countOf(arr, v) < MAX_STACK ? [...arr, v] : arr));
    }
  };
  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g.spanW) return;
    const grab = grabRef.current;
    if (grab) {
      const v = valAtX(cssX);
      const arr = dataRef.current;
      if (arr[grab.i] !== v) {
        if (countOf(arr, v) >= MAX_STACK && v !== grab.startVal) return;
        grab.moved = true;
        const next = arr.slice();
        next[grab.i] = v;
        setData(next);
      }
      return;
    }
    let col = null;
    if (cssY > g.plotTop - 6 && cssY < g.baseY + 6 && cssX > g.padL - g.cellW && cssX < g.padL + g.spanW + g.cellW) {
      if (!hitDot(cssX, cssY)) col = valAtX(cssX);
    }
    if (col !== hoverColRef.current) {
      hoverColRef.current = col;
      draw();
    }
  };
  const onPointerUp = () => {
    const grab = grabRef.current;
    if (grab) {
      if (!grab.moved) {
        const arr = dataRef.current;
        setData(arr.filter((_, k) => k !== grab.i));
      }
      grabRef.current = null;
    }
  };
  const onPointerLeave = () => {
    onPointerUp();
    if (hoverColRef.current != null) {
      hoverColRef.current = null;
      draw();
    }
  };

  /* ---- toolbar / presets ------------------------------------------------- */
  const applyPreset = (arr) => setData(arr.slice(0, MAX_POINTS));
  const randomSet = () => {
    const k = 6 + Math.floor(Math.random() * 5);
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
    applyPreset(arr);
  };
  const clearData = () => applyPreset([]);

  /* recursive-pincer controls: outer → median, then both halves → Q1/Q3 */
  const stepIn = () => {
    if (!outerDone) setPeel((p) => Math.min(maxPeel, p + 1));
    else setPeelQ((p) => Math.min(maxPeelQ, p + 1));
  };
  const stepOut = () => {
    if (peelQC > 0) setPeelQ((p) => Math.max(0, p - 1));
    else setPeel((p) => Math.max(0, p - 1));
  };
  const findAll = () => {
    setPeel(maxPeel);
    setPeelQ(maxPeelQ);
  };

  const toggleLens = (key, unlock) => {
    if (step < unlock) return;
    setLensOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  const pincerLabel = !outerDone
    ? 'median ' + peelC + '/' + maxPeel
    : !quartDone
    ? 'quarters ' + peelQC + '/' + maxPeelQ
    : 'Q1·Q2·Q3 found';
  const pincerAtEnd = quartDone || (maxPeel === 0 && maxPeelQ === 0);

  const spoken =
    n === 0
      ? 'The data set is empty. Click the number line to add points.'
      : `A data set of ${n} value${n === 1 ? '' : 's'}. ` +
        `Five-number summary: minimum ${minV}, Q1 ${q1Str}, median ${medStr}, Q3 ${q3Str}, maximum ${maxV}. ` +
        (eff.iqr ? `The interquartile range is ${iqrStr}${bx.outliers.length ? `, with ${bx.outliers.length} outlier${bx.outliers.length === 1 ? '' : 's'}.` : '.'}` : '');

  const stageClass = 'stage' + (showStrip ? ' has-strip' : showBox || calib ? ' has-box' : '');

  return (
    <div className="bplab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Box Plots — the Five-Number Summary</h1>
        <p className="lede">
          Find the <em>median</em>, then run the same <em>pincer</em> on each half to get the{' '}
          <em>quartiles</em> Q1 and Q3. Those cuts — with the min and max — are the{' '}
          <span className="mono">five-number summary</span>, and drawing them makes a{' '}
          <em>box-and-whisker plot</em>: a box over the middle 50% of the data, whose width is the{' '}
          <em>IQR</em>. Each lens unlocks with the lesson, so the picture is never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <BoxEquation
                exists={exists}
                n={n}
                minV={minV}
                q1Str={q1Str}
                medStr={medStr}
                q3Str={q3Str}
                maxV={maxV}
                iqrStr={iqrStr}
                showIqr={eff.iqr}
              />
            </p>
            <p className="equation-sub mono">
              {exists ? (
                <>
                  box = <b className="carm">Q1</b> to <b className="carm">Q3</b> &nbsp;·&nbsp; IQR = {q3Str} − {q1Str} ={' '}
                  <b className="carm">{iqrStr}</b>
                  {eff.iqr && bx.outliers.length > 0 ? (
                    <>
                      {' '}
                      &nbsp;·&nbsp; {bx.outliers.length} outlier{bx.outliers.length === 1 ? '' : 's'}
                    </>
                  ) : null}
                </>
              ) : (
                'add points to build a box plot'
              )}
            </p>
          </div>

          <div
            className={stageClass}
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            {!showStrip && <span className="hint mono">click to add · click a dot to remove · drag to move</span>}
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — your box matches the target.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Q1</span>
              <span className="fact-v mono carm">{exists ? q1Str : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Median</span>
              <span className="fact-v mono carm big">{exists ? medStr : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Q3</span>
              <span className="fact-v mono carm">{exists ? q3Str : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">IQR</span>
              <span className="fact-v mono blue">{exists ? iqrStr : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            {showStrip && (
              <div className="pincer-group" role="group" aria-label="Recursive pincer controls">
                <button type="button" className="btn ghost" onClick={stepOut} disabled={(peelC === 0 && peelQC === 0) || n === 0}>
                  ◄ Step out
                </button>
                <span className="peel mono" aria-live="polite">
                  {n === 0 ? '—' : pincerLabel}
                </span>
                <button type="button" className="btn ghost" onClick={stepIn} disabled={pincerAtEnd || n === 0}>
                  Step in ►
                </button>
                <button type="button" className="btn ghost" onClick={findAll} disabled={quartDone || n === 0}>
                  Find all
                </button>
              </div>
            )}
          </div>
          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={() => applyPreset([2, 3, 4, 5, 6, 7, 8, 9])}>
              Even (n=8)
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 2, 3, 4, 5, 6, 7])}>
              Odd (n=7)
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([2, 3, 4, 4, 5, 5, 6, 10])}>
              Outlier
            </button>
            <button type="button" className="btn ghost" onClick={randomSet}>
              Random
            </button>
            <button type="button" className="btn ghost" onClick={clearData} disabled={n === 0}>
              Clear
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

          <div className="lenses" role="group" aria-label="Box-plot lenses">
            {LENSES.map((l) => {
              const unlocked = step >= l.unlock;
              const on = unlocked && lensOn[l.key];
              return (
                <button
                  type="button"
                  key={l.key}
                  className={'lens' + (on ? ' on' : '') + (!unlocked ? ' locked' : '')}
                  style={on ? { borderColor: l.color, boxShadow: `inset 0 0 0 1px ${l.color}` } : undefined}
                  onClick={() => toggleLens(l.key, l.unlock)}
                  disabled={!unlocked}
                  aria-pressed={on}
                >
                  <span className="lk" style={{ background: l.color }} aria-hidden="true" />
                  <span className="lname">{l.name}</span>
                  <span className="lrole">{unlocked ? l.role : 'unlocks soon'}</span>
                  <span className="lstate mono" aria-hidden="true">
                    {!unlocked ? '🔒' : on ? 'on' : 'off'}
                  </span>
                </button>
              );
            })}
          </div>

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

          {current.calib && target != null && (
            <div className="calib">
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {n < 4 ? 'need ≥ 4 dots' : `hit Q1 ${target.q1} · med ${target.med} · Q3 ${target.q3}`}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setData([]);
                }}
              >
                New target
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
                  setPeel(0);
                  setPeelQ(0);
                  setLensOn({ order: false, quart: false, box: false, iqr: false });
                  setData(START_DATA);
                }}
              >
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">
          median = Q2 &nbsp;·&nbsp; Q1 = median of lower half &nbsp;·&nbsp; Q3 = median of upper half &nbsp;·&nbsp; box =
          Q1→Q3 &nbsp;·&nbsp; IQR = Q3 − Q1
        </span>{' '}
        &nbsp;·&nbsp; a value beyond 1.5·IQR of the box is an outlier (CCSS 6.SP.B.4/5). Data here are whole numbers 0–10;
        the same ideas scale to any values.
      </footer>

      <style jsx>{`
        .bplab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --slate: #5b6b7b;
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
          font-size: clamp(24px, 3.6vw, 33px);
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
            grid-template-columns: 1fr;
          }
        }
        .panel {
          background: #fff;
          border: 1px solid rgba(28, 43, 58, 0.15);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(28, 43, 58, 0.05);
        }
        .stage-panel {
          padding: 14px;
        }
        .stage-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .equation {
          margin: 0;
        }
        .equation-sub {
          color: var(--ink-soft);
          font-size: 12.5px;
          margin: 0;
          font-variant-numeric: tabular-nums;
        }
        .equation-sub .carm {
          color: var(--curve);
          font-weight: 700;
        }
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        .stage.has-box {
          aspect-ratio: 8 / 5.4;
        }
        .stage.has-strip {
          aspect-ratio: 8 / 7.4;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
          .stage.has-box {
            aspect-ratio: 3 / 3.4;
          }
          .stage.has-strip {
            aspect-ratio: 3 / 4.4;
          }
        }
        .stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .hint {
          position: absolute;
          left: 10px;
          bottom: 9px;
          font-size: 11px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.82);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px 16px;
          margin: 14px 4px 4px;
        }
        @media (max-width: 620px) {
          .facts {
            grid-template-columns: 1fr 1fr;
          }
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 6px 0;
          border-top: 1px solid rgba(28, 43, 58, 0.08);
        }
        .fact-k {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .fact-v {
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }
        .fact-v.big {
          font-size: 20px;
        }
        .fact-v.carm {
          color: var(--curve);
          font-weight: 700;
        }
        .fact-v.blue {
          color: var(--blue);
          font-weight: 600;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .pincer-group {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          padding: 4px 8px;
          border: 1px dashed rgba(200, 30, 79, 0.35);
          border-radius: 9px;
          background: rgba(200, 30, 79, 0.03);
        }
        .peel {
          font-size: 12px;
          font-weight: 700;
          color: var(--curve);
          min-width: 92px;
          text-align: center;
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
          background: var(--curve);
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
        .lenses {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 4px;
        }
        @media (max-width: 400px) {
          .lenses {
            grid-template-columns: 1fr;
          }
        }
        .lens {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          grid-template-rows: auto auto;
          align-items: center;
          gap: 1px 8px;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid rgba(28, 43, 58, 0.18);
          border-radius: 9px;
          background: var(--paper);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, opacity 0.15s;
        }
        .lens:not(:disabled):hover {
          border-color: var(--ink);
        }
        .lens.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lens.on {
          background: #fff;
        }
        .lk {
          grid-row: 1 / 3;
          grid-column: 1;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .lname {
          grid-column: 2;
          grid-row: 1;
          font-weight: 700;
          font-size: 13px;
        }
        .lrole {
          grid-column: 2;
          grid-row: 2;
          font-size: 10.5px;
          color: var(--ink-soft);
        }
        .lstate {
          grid-column: 3;
          grid-row: 1 / 3;
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-soft);
        }
        .lens.on .lstate {
          color: var(--curve);
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
          border-left: 3px solid var(--curve);
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
        .meter {
          height: 12px;
          border-radius: 6px;
          background: rgba(28, 43, 58, 0.1);
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(200, 30, 79, 0.55), var(--curve));
          transition: width 0.12s ease-out;
        }
        .meter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          gap: 8px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 11.5px;
          text-align: right;
        }
        .stamp {
          font: 700 12px/1 var(--mono);
          letter-spacing: 0.16em;
          color: var(--ok);
          border: 2px solid var(--ok);
          border-radius: 6px;
          padding: 4px 8px;
          transform: rotate(-3deg);
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
        :global(.bplab) :focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .btn,
          .meter-fill,
          .choice,
          .lens {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
