'use client';

/* ============================================================================
   DataLab — an interactive "bench" for DATA: a set of numbers has a shape and a
   center.  Build a dot plot, then find the three centers — MODE (most frequent),
   MEDIAN (the middle), MEAN (the fair share) — and the RANGE (the spread).  The
   thesis of the lab is the mean's deepest truth: it is the BALANCE POINT of the
   data, the one place where the distances to the left exactly cancel the
   distances to the right, so Σ(xᵢ − mean) = 0.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 5–7
   (CCSS 6.SP.A.2 "understand that a set of data has a distribution described by
   its center, spread, and shape"; 6.SP.B.5.c "summarize with measures of center";
   5.MD-style dot plots).  A child who can add and divide meets a whole set of
   numbers at once, learns that "center" is not one idea but three, and — the
   payoff — sees WHY the mean sits where it does: it is the point of balance.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Sibling
   of the Number-line labs (Integer, Line): the dot plot lives on a number line,
   and the mean rides it like a fulcrum.  Two linked pictures of one data set —
   the Decimal/Percentage "one number, two models" signature, retuned for data:
     • the DOT PLOT (top) — value on a number line, a stacked dot per data point.
       This is where the distribution's SHAPE, its MODE (tallest stack), its
       MEDIAN (the middle-splitting line), its RANGE (the min→max bracket), and
       the mean-as-BALANCE-POINT (a triangular fulcrum with deviation arrows that
       provably cancel) all live.
     • the FAIR-SHARE TOWERS (bottom, revealed once the mean is in play) — one
       tower per data point, height = its value; the dashed mean line is the
       height everyone reaches when the cubes are shared out equally.  "Level"
       pours the towers to that common height.  Mean = equal share.

   One-accent discipline: CARMINE is the mathematical object the lab is built to
   reveal — the MEAN: the fulcrum, the mean marker, the deviation arrows, the
   fair-share line, the mean readout.  The other centers are clearly SECONDARY
   and each keeps its own quiet hue so they never fight the accent: MEDIAN is
   blue (structure/position), MODE is gold, RANGE is slate-grey (it is spread,
   not center).  Green is reserved for "correct" and "CALIBRATED".

   All statistics are computed EXACTLY from integer data, so a K-12 student never
   meets a float artefact like 7.3000000004:
     • data values are integers 0…10.
     • the mean is kept as the exact fraction sum/n, reduced by an integer gcd,
       and rendered either as an integer, an exact terminating decimal (by
       integer long division), or a clearly-marked "≈" 2-decimal rounding.
     • the median is (a+b)/2 of the two middle values — an integer or a clean .5.
     • the balance identity Σ(xᵢ − mean) = 0 is checked in ×n integer units
       (Σ(xᵢ·n − sum) = 0), so the "left pull = right pull" readout is exact.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/DataLab.jsx
     2. Import and render it:
          import DataLab from './DataLab';
          export default function Page() { return <DataLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the data array, which
              lenses are on, the lesson step).
     MODEL  — the statistics are exact integer arithmetic; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The "dials" here are LENSES, not sliders: the data is
   built by clicking the number line, and each lens (Mode, Median, Mean, Range)
   unlocks one per lesson step and overlays that measure on the plot — so the
   picture is never ahead of the idea.  The value axis is small and integer so
   the dot plot stays legible and every statistic is classroom-clean.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 10; // number line runs 0…10
const MAX_POINTS = 12; // total dots
const MAX_STACK = 8; // dots in one column

// a friendly starting data set: slightly right-clustered, one clear mode at 5
const START_DATA = [2, 3, 4, 4, 5, 5, 5, 6, 7, 8];

const STEP_DATA = 0; // meet data — build a dot plot
const STEP_MODE = 1; // mode — the most frequent value
const STEP_MEDIAN = 2; // median — the middle value
const STEP_MEAN = 3; // mean — the fair share (Σx ÷ n); towers appear
const STEP_BALANCE = 4; // mean = balance point (deviations cancel)
const STEP_SPREAD = 5; // range + the outlier trap (mean moves, median resists)
const STEP_CALIB = 6; // build a set that balances on the target (calibration)

// the lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'mode', unlock: STEP_MODE, color: '#d9982b', name: 'Mode', role: 'the most common value' },
  { key: 'median', unlock: STEP_MEDIAN, color: '#3f74a6', name: 'Median', role: 'the middle value' },
  { key: 'mean', unlock: STEP_MEAN, color: '#c81e4f', name: 'Mean', role: 'the balance point' },
  { key: 'range', unlock: STEP_SPREAD, color: '#5b6b7b', name: 'Range', role: 'the spread: max − min' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model. The statistics, EXACT. Everything is derived from the integer
   data array; nothing here knows a pixel.
   ------------------------------------------------------------------------- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
function reduceFrac(num, den) {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

// exact terminating decimal for num/den by integer long division; if the
// fraction does not terminate the loop is guarded and this is not called.
function longDivide(num, den) {
  const intPart = Math.floor(num / den);
  let rem = num % den;
  if (rem === 0) return String(intPart);
  let frac = '';
  let guard = 0;
  while (rem !== 0 && guard < 14) {
    rem *= 10;
    frac += Math.floor(rem / den);
    rem %= den;
    guard++;
  }
  return intPart + '.' + frac;
}
function terminates(den) {
  let d = den;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
// round num/den to hundredths, formatted exactly (no float artefact)
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact decimal, or "≈" 2-dp rounding
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}

// frequency table + mode(s)
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const sorted = [...data].sort((a, b) => a - b);
  const freq = new Map();
  for (const v of data) freq.set(v, (freq.get(v) || 0) + 1);
  let maxFreq = 0;
  for (const c of freq.values()) if (c > maxFreq) maxFreq = c;
  // a "mode" only exists when some value repeats (maxFreq ≥ 2)
  const modes = [];
  if (maxFreq >= 2) {
    for (const [v, c] of freq) if (c === maxFreq) modes.push(v);
    modes.sort((a, b) => a - b);
  }
  const minV = n ? sorted[0] : 0;
  const maxV = n ? sorted[n - 1] : 0;
  // median as an exact ratio {num, den}
  let medNum = 0;
  let medDen = 1;
  if (n) {
    if (n % 2) {
      medNum = sorted[(n - 1) / 2];
      medDen = 1;
    } else {
      medNum = sorted[n / 2 - 1] + sorted[n / 2];
      medDen = 2;
    }
  }
  return { n, sum, sorted, freq, maxFreq, modes, minV, maxV, medNum, medDen };
}

// the balance identity, in exact ×n integer units:  Σ(xᵢ·n − sum) = 0.
// leftPull = Σ over xᵢ<mean of (sum − xᵢ·n); rightPull = Σ over xᵢ>mean of (xᵢ·n − sum).
// These are equal integers; the per-side distance is leftPull/n.
function balancePulls(data, sum, n) {
  let left = 0;
  let right = 0;
  for (const v of data) {
    const t = v * n - sum; // sign matches (v − mean)
    if (t < 0) left += -t;
    else if (t > 0) right += t;
  }
  return { left, right }; // left === right, always
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): a target mean is marked on the number line as a fulcrum; the
   student builds ANY data set (at least 3 points) whose mean balances exactly on
   it.  There are many correct sets, which is the point — every one of them has
   its dots arranged so the left pull equals the right pull about the target.
   The meter reads closeness in value units (whole-independent), and CALIBRATED
   is an exact hit: sum === target·n.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 2.2; // value-units spread across the meter
const matchPercent = (mean, exists, T) =>
  exists ? 100 * Math.max(0, 1 - Math.abs(mean - T) / MATCH_SCALE) : 0;
const isCalibrated = (sum, n, T) => n >= 3 && sum === T * n;

function makeTarget(prev) {
  let t;
  do {
    t = 3 + Math.floor(Math.random() * 5); // integer mean 3…7
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The MEAN is the star, in the carmine accent; the
   other centers ride along as small chips as their lenses unlock.  Rendered by a
   CHILD component, so styles are INLINED (styled-jsx only scopes a component's
   own JSX) — this keeps the readout identical in Next.js and any plain preview.
   ------------------------------------------------------------------------- */
const CHIP_BASE = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: '12.5px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '999px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};
function DataEquation({ meanStr, meanApprox, exists, n, showMedian, medianStr, showMode, modeStr, showRange, rangeStr }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '30px',
            fontWeight: 700,
            color: '#c81e4f',
            letterSpacing: '0.01em',
          }}
        >
          {exists ? (meanApprox ? '≈ ' : '') + meanStr : '—'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#5b6b7b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          mean
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
      {showMode && (
        <span style={{ ...CHIP_BASE, color: '#b07a17', background: 'rgba(217,152,43,0.14)' }}>mode {modeStr}</span>
      )}
      {showMedian && (
        <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.12)' }}>median {medianStr}</span>
      )}
      {showRange && (
        <span style={{ ...CHIP_BASE, color: '#5b6b7b', background: 'rgba(91,107,123,0.12)' }}>range {rangeStr}</span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the lens unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real data
   misconceptions ("mean is always a value in the set," "median = middle of the
   number line," "the mode is the biggest number").  Next is gated on ANSWERED,
   not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet data — build a dot plot',
    body:
      'A data set is just a collection of numbers. Click the number line to drop a dot for each ' +
      'value; click a dot to remove it, or drag it to a new value. Dots stack up where a value ' +
      'repeats. The stacks make a picture of the data — its shape: where it clusters, where it ' +
      'spreads, whether it leans one way.',
    q: 'On a dot plot, what does a TALL stack of dots mean?',
    choices: ['That value happened many times', 'That value is very large', 'There is one big number there'],
    answer: 0,
    feedback:
      'Height counts how OFTEN a value occurs, not how big it is. A tall stack over the number 4 ' +
      'means 4 came up many times. The horizontal position tells you the value; the height tells ' +
      'you the frequency.',
  },
  {
    title: 'Mode — the most common value',
    body:
      'The MODE is the value that appears most often — the tallest stack. A data set can have one ' +
      'mode, several tied modes, or no mode at all (if nothing repeats). The mode is the only ' +
      'center that must be an actual value in the set, and the only one that also works for ' +
      'non-numbers like favorite colors.',
    q: 'Which value is the mode of  2, 5, 5, 5, 8, 9 ?',
    choices: ['5 — it appears most often', '9 — it is the largest', '5.5 — it is in the middle'],
    answer: 0,
    feedback:
      'The mode is 5: it appears three times, more than any other. Notice the mode is about the ' +
      'tallest stack, not the biggest number (9) — a common mix-up. If two values tied for tallest, ' +
      'the set would have two modes.',
  },
  {
    title: 'Median — the middle value',
    body:
      'Line the data up smallest to largest; the MEDIAN is the value in the middle — as many dots ' +
      'below it as above. With an ODD count there is a single middle dot. With an EVEN count there ' +
      'are two middle dots, and the median is halfway between them (their average). The blue line ' +
      'splits the plot into two equal halves.',
    q: 'What is the median of  3, 6, 7, 10  (an even count)?',
    choices: ['6.5 — halfway between the two middle values 6 and 7', '7 — the larger middle value', '6.5 — halfway across the number line'],
    answer: 0,
    feedback:
      'The two middle values are 6 and 7, so the median is 6.5 — the middle of ' +
      'the DATA, not of the number line.',
  },
  {
    title: 'Mean — the fair share',
    body:
      'The MEAN is what everyone gets if you pool all the values and share them out equally: add ' +
      'them up, divide by how many. mean = (Σx) ÷ n. The towers below show it — pour the tall ones ' +
      'into the short ones until all are level, and the level they reach IS the mean. Press "Level" ' +
      'to watch. The mean can land between whole numbers.',
    q: 'What is the mean of  4, 6, 6, 8 ?',
    choices: ['6 — because (4+6+6+8) ÷ 4 = 24 ÷ 4', '6 — because it is the middle value', '6.5 — the average of 4 and 8, the smallest and largest'],
    answer: 0,
    feedback:
      'Add them: 4 + 6 + 6 + 8 = 24. Divide by n = 4: 24 ÷ 4 = 6. That is the fair share — level the ' +
      'towers and each reaches 6. (Here the mean equals a value in the set, but often it does not — ' +
      'that is fine; a fair share need not be a whole item.)',
  },
  {
    title: 'The mean is the balance point',
    body:
      'Here is the mean’s secret. Put the number line on a triangular fulcrum at the mean: the plot ' +
      'balances. Every dot to the LEFT pulls one way, every dot to the RIGHT pulls the other — and ' +
      'the two pulls are always exactly equal. Add up the distances below the mean and the distances ' +
      'above it: same total. In symbols, Σ(x − mean) = 0.',
    q: 'A dot 3 units left of the mean and a dot far to the right… what keeps the plot balanced?',
    choices: [
      'The total distance of the left dots equals the total distance of the right dots',
      'There are the same number of dots on each side',
      'The left and right dots are the same size',
    ],
    answer: 0,
    feedback:
      'Balance is about DISTANCE, not count. One far dot can balance several near ones, because it ' +
      'reaches farther from the fulcrum. The mean sits exactly where the left distances and right ' +
      'distances add to the same total — that is what makes it the center of balance.',
  },
  {
    title: 'Spread, and the outlier trap',
    body:
      'The RANGE measures spread: range = max − min, the width of the bracket under the line. Now ' +
      'test the centers: drag one dot far to the right to make an OUTLIER. Watch the carmine fulcrum ' +
      '(mean) slide toward it — the mean chases extreme values. The blue median barely moves. Try it.',
    q: 'You add one huge outlier to a data set. Which center is pulled the most?',
    choices: ['The mean — it is the balance point, so distance drags it', 'The median — the middle jumps to the outlier', 'The mode — the tallest stack moves'],
    answer: 0,
    feedback:
      'The mean gets pulled toward an outlier, because balance depends on distance and an outlier is ' +
      'far away. The median only cares about POSITION in the order, so one extreme value nudges it at ' +
      'most one step. That is why medians are used for things like house prices and incomes.',
  },
  {
    title: 'Balance it on the target',
    body:
      'Final challenge. A grey target fulcrum is fixed on the number line. Build a data set — at ' +
      'least 3 dots — whose carmine mean balances exactly on it. There are many winning sets: any ' +
      'arrangement whose left pull equals its right pull about the target. The meter reads CALIBRATED ' +
      'when your mean lands on the target. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function DataLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // target mean during calibration
  const [levelOn, setLevelOn] = useState(false); // fair-share leveling animation
  const [lensOn, setLensOn] = useState({ mode: false, median: false, mean: false, range: false });

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const dataRef = useRef(data); // latest data for pointer handlers
  const grabRef = useRef(null); // { i, startVal, moved } while dragging a dot
  const hoverColRef = useRef(null); // hovered add-column (integer value) or null
  const levelTRef = useRef(0); // 0..1 leveling progress

  dataRef.current = data;

  const current = STEPS[step];
  const calib = !!current.calib;

  const st = computeStats(data);
  const { n, sum, modes, maxFreq, minV, maxV, medNum, medDen } = st;
  const meanExists = n > 0;
  const meanVal = n > 0 ? sum / n : 0;
  const medianVal = n > 0 ? medNum / medDen : 0;
  const rangeVal = n > 0 ? maxV - minV : 0;

  const meanFmt = n > 0 ? fmtRatio(sum, n) : { text: '—', approx: false };
  const medianFmt = n > 0 ? fmtRatio(medNum, medDen) : { text: '—', approx: false };
  const modeStr = maxFreq >= 2 ? modes.join(', ') : 'none';
  const rangeStr = n > 0 ? String(rangeVal) : '—';

  const pulls = n > 0 ? balancePulls(data, sum, n) : { left: 0, right: 0 };
  const pullFmt = n > 0 ? fmtRatio(pulls.left, n) : { text: '0', approx: false };

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    mode: lensOn.mode && step >= STEP_MODE,
    median: lensOn.median && step >= STEP_MEDIAN,
    mean: lensOn.mean && step >= STEP_MEAN,
    range: lensOn.range && step >= STEP_SPREAD,
  };
  const showBalance = eff.mean && step >= STEP_BALANCE; // deviation arrows + pulls
  const showTowers = step >= STEP_MEAN; // the fair-share view is revealed with the mean

  const targetMean = calib && target != null ? target : null;
  const matchPct = targetMean != null ? matchPercent(meanVal, meanExists, targetMean) : 0;
  const calibrated = targetMean != null ? isCalibrated(sum, n, targetMean) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    data,
    n,
    sum,
    meanVal,
    meanExists,
    medianVal,
    modes,
    maxFreq,
    minV,
    maxV,
    eff,
    showBalance,
    showTowers,
    pulls,
    calib,
    targetMean,
    calibrated,
    meanText: (meanFmt.approx ? '≈ ' : '') + meanFmt.text,
  };

  /* ---- value → screen transform + full redraw from state ------------------ */
  const draw = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const Wd = stage.clientWidth;
    const Hd = stage.clientHeight;
    if (Wd === 0 || Hd === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped for perf & crisp lines
    canvas.width = Math.round(Wd * dpr);
    canvas.height = Math.round(Hd * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const PAPER = '#FBFBF8';
    const CARMINE = '#C81E4F'; // the MEAN — fulcrum, mean marker, deviations, fair share
    const CARM_SOFT = 'rgba(200,30,79,0.5)';
    const BLUE = '#3F74A6'; // the MEDIAN
    const GOLD = '#D9982B'; // the MODE
    const DOT = 'rgba(28,43,58,0.78)'; // a plain data dot
    const AXIS = 'rgba(28,43,58,0.55)';

    const S = sceneRef.current;
    ctx.clearRect(0, 0, Wd, Hd);

    /* faint quadrille backdrop behind everything */
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

    /* ---- regions ----------------------------------------------------------- */
    const padL = 34;
    const padR = 24;
    const spanW = Wd - padL - padR;
    const xOf = (v) => padL + ((v - VMIN) / (VMAX - VMIN)) * spanW;

    // when the towers are shown, the dot plot takes the top half; otherwise it
    // sits centred in the box with balanced margins above and below.
    const plotTop = 34;
    const plotBottom = S.showTowers ? Math.round(Hd * 0.5) : Math.round(Hd * 0.66);
    const baseY = plotBottom; // the number line
    const cellW = spanW / (VMAX - VMIN);

    /* caption above the dot plot */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dot plot — each dot is one data point', padL, 8);

    /* ---- the number line + ticks ------------------------------------------ */
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

    /* ---- dot geometry ----------------------------------------------------- */
    const availStackH = baseY - plotTop - 10;
    const step0 = availStackH / MAX_STACK; // vertical spacing per stacked dot
    let dotR = Math.min(cellW * 0.36, step0 * 0.46, 12);
    dotR = Math.max(5, dotR);

    // build per-dot positions, stacking each column bottom→up in array order
    const colCount = new Map();
    const dots = [];
    S.data.forEach((v, i) => {
      const j = colCount.get(v) || 0;
      colCount.set(v, j + 1);
      const x = xOf(v);
      const y = baseY - 10 - dotR - j * step0;
      dots.push({ i, x, y, r: dotR, val: v });
    });

    // hovered add-column highlight (light vertical band)
    if (S.hoverCol != null) {
      const X = xOf(S.hoverCol);
      ctx.fillStyle = 'rgba(63,116,166,0.10)';
      ctx.fillRect(X - cellW / 2, plotTop, cellW, baseY - plotTop);
    }

    /* ---- MEDIAN lens: split line through the plot -------------------------- */
    if (S.eff.median && S.n > 0) {
      const X = xOf(S.medianVal);
      ctx.save();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      // flag
      ctx.fillStyle = BLUE;
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('median', X, plotTop + 2);
      ctx.restore();
    }

    /* ---- the dots (mode-colored if the mode lens is on) -------------------- */
    const modeSet = new Set(S.eff.mode ? S.modes : []);
    for (const d of dots) {
      const isMode = modeSet.has(d.val);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = isMode ? 'rgba(217,152,43,0.9)' : DOT;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isMode ? '#a9761a' : 'rgba(251,251,248,0.9)';
      ctx.stroke();
    }

    /* ---- MODE lens: flag over the tallest stack(s) ------------------------ */
    if (S.eff.mode && S.modes.length > 0) {
      ctx.fillStyle = '#a9761a';
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const mv of S.modes) {
        const X = xOf(mv);
        const topY = baseY - 10 - dotR - (S.maxFreq - 1) * step0 - dotR - 6;
        ctx.fillText('mode', X, topY);
      }
    }

    /* ---- RANGE lens: bracket under the axis ------------------------------- */
    if (S.eff.range && S.n > 0) {
      const y = baseY + 26;
      const x1 = xOf(S.minV);
      const x2 = xOf(S.maxV);
      ctx.save();
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1, y - 6);
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.moveTo(x2, y);
      ctx.lineTo(x2, y - 6);
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('range = ' + S.maxV + ' − ' + S.minV + ' = ' + (S.maxV - S.minV), (x1 + x2) / 2, y + 3);
      ctx.restore();
    }

    /* ---- MEAN lens: fulcrum + marker + (balance) deviation arrows ---------- */
    if (S.eff.mean && S.n > 0) {
      const X = xOf(S.meanVal);

      // deviation arrows from each dot toward the mean (balance step)
      if (S.showBalance) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200,30,79,0.45)';
        ctx.lineWidth = 1.3;
        for (const d of dots) {
          if (Math.abs(d.val - S.meanVal) < 1e-9) continue;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(X, d.y);
          ctx.stroke();
          // little arrowhead pointing at the fulcrum line
          const dir = d.x > X ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(X, d.y);
          ctx.lineTo(X - dir * 5, d.y - 3);
          ctx.moveTo(X, d.y);
          ctx.lineTo(X - dir * 5, d.y + 3);
          ctx.stroke();
        }
        ctx.restore();
      }

      // the mean line up through the plot
      ctx.save();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY);
      ctx.stroke();

      // triangular fulcrum below the line
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(X, baseY + 2);
      ctx.lineTo(X - 9, baseY + 16);
      ctx.lineTo(X + 9, baseY + 16);
      ctx.closePath();
      ctx.fill();

      // mean pill above the plot
      const pill = 'mean ' + S.meanText;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 20;
      const half = bw / 2 + 4;
      const px = Math.min(Math.max(X, padL + half), Wd - padR - half);
      const pillY = plotTop - 20;
      const bxp = px - bw / 2;
      const rr = 6;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, pillY);
      ctx.arcTo(bxp + bw, pillY, bxp + bw, pillY + bh, rr);
      ctx.arcTo(bxp + bw, pillY + bh, bxp, pillY + bh, rr);
      ctx.arcTo(bxp, pillY + bh, bxp, pillY, rr);
      ctx.arcTo(bxp, pillY, bxp + bw, pillY, rr);
      ctx.closePath();
      ctx.fillStyle = CARMINE;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, pillY + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ---- calibration target fulcrum (grey, fixed) ------------------------- */
    if (S.calib && S.targetMean != null) {
      const X = xOf(S.targetMean);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY + 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,107,123,0.9)';
      ctx.beginPath();
      ctx.moveTo(X, baseY + 18);
      ctx.lineTo(X - 8, baseY + 30);
      ctx.lineTo(X + 8, baseY + 30);
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target ' + S.targetMean, X, plotTop + 2);
      ctx.restore();
    }

    // empty-state prompt
    if (S.n === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click the number line to add data points', (padL + Wd - padR) / 2, (plotTop + baseY) / 2);
    }

    /* ====================== FAIR-SHARE TOWERS (bottom) ==================== */
    if (S.showTowers) {
      // sit the towers well clear of the number-line ticks and the range bracket
      const tTop = plotBottom + 56;
      const tBottom = Hd - 22;
      const tH = tBottom - tTop;
      const tPadL = padL;
      const tSpanW = Wd - tPadL - padR;
      const yOfVal = (val) => tBottom - (val / VMAX) * tH;

      // caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('fair share — level the towers to the mean', tPadL, tTop - 6);

      // value axis (0, 5, 10) + faint unit gridlines
      ctx.strokeStyle = 'rgba(28,43,58,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = 0; v <= VMAX; v++) {
        const Y = Math.round(yOfVal(v)) + 0.5;
        ctx.moveTo(tPadL, Y);
        ctx.lineTo(Wd - padR, Y);
      }
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const v of [0, 5, 10]) ctx.fillText(String(v), tPadL - 6, yOfVal(v));

      if (S.n > 0) {
        // one tower per data point, sorted ascending, height tweened toward mean
        const sortedVals = [...S.data].sort((a, b) => a - b);
        const tv = levelTRef.current; // 0..1 leveling progress
        const slotW = tSpanW / S.n;
        const barW = Math.min(slotW * 0.68, 40);
        for (let k = 0; k < S.n; k++) {
          const v = sortedVals[k];
          const shown = v + (S.meanVal - v) * tv; // lerp value → mean
          const cx = tPadL + slotW * (k + 0.5);
          const topY = yOfVal(shown);
          const h = tBottom - topY;
          ctx.fillStyle = CARM_SOFT;
          ctx.fillRect(cx - barW / 2, topY, barW, h);
          ctx.strokeStyle = 'rgba(200,30,79,0.85)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(cx - barW / 2 + 0.5, topY + 0.5, barW - 1, h - 0.5);
        }

        // the fair-share (mean) line across the towers
        const my = yOfVal(S.meanVal);
        ctx.save();
        ctx.strokeStyle = CARMINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        ctx.moveTo(tPadL, my);
        ctx.lineTo(Wd - padR, my);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('mean ' + S.meanText, Wd - padR, my - 3);
        ctx.restore();
      }
    }

    /* store geometry for hit-testing */
    geoRef.current = { padL, spanW, baseY, plotTop, cellW, dotR, dots };
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [data, step, target, lensOn, levelOn, draw]);

  /* redraw on resize (the canvas is fluid) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-enable the lens that unlocks on this step (picture keeps pace) */
  useEffect(() => {
    const l = LENSES.find((x) => x.unlock === step);
    if (l) setLensOn((prev) => (prev[l.key] ? prev : { ...prev, [l.key]: true }));
  }, [step]);

  /* set up the calibration target the first time we reach it; start from an
     empty set so the build is clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setData([]);
      setLensOn((prev) => ({ ...prev, mean: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the fair-share leveling animation — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    const wantsReduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetT = levelOn ? 1 : 0;
    if (wantsReduce) {
      levelTRef.current = targetT;
      draw();
      return;
    }
    let raf;
    let last = null;
    const speed = 1.8; // per second
    const loop = (now) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      const cur = levelTRef.current;
      const next = cur + Math.sign(targetT - cur) * speed * dt;
      levelTRef.current = Math.abs(next - targetT) <= speed * dt ? targetT : next;
      draw();
      if (levelTRef.current !== targetT) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelOn, data, step, draw]);

  /* keep the scene's hover column fresh for the renderer */
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
    // otherwise: add a dot in the dot-plot area. The functional updater always
    // sees the latest array, so even very rapid clicks accumulate correctly.
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
        // moving to a value whose column is full? block it (keep current)
        if (countOf(arr, v) >= MAX_STACK && v !== grab.startVal) return;
        grab.moved = true;
        const next = arr.slice();
        next[grab.i] = v;
        setData(next);
      }
      return;
    }
    // hover: which column would a click add to?
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
        // a click on a dot with no drag = remove it
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
  const applyPreset = (arr) => {
    if (levelOn) setLevelOn(false);
    levelTRef.current = 0;
    setData(arr.slice(0, MAX_POINTS));
  };
  const randomSet = () => {
    const k = 6 + Math.floor(Math.random() * 5); // 6…10 points
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
    applyPreset(arr);
  };
  const clearData = () => applyPreset([]);

  const resetData = () => {
    if (levelOn) setLevelOn(false);
    levelTRef.current = 0;
    if (calib) setData([]);
    else setData(START_DATA);
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

  /* spoken description (accessibility) */
  const spoken =
    n === 0
      ? 'The data set is empty. Click the number line to add points.'
      : `A data set of ${n} value${n === 1 ? '' : 's'}. ` +
        `The mean is ${meanFmt.approx ? 'about ' : ''}${meanFmt.text}. ` +
        (eff.median ? `The median is ${medianFmt.text}. ` : '') +
        (eff.mode ? `The mode is ${modeStr === 'none' ? 'none — nothing repeats' : modeStr}. ` : '') +
        (eff.range ? `The range is ${rangeStr}. ` : '') +
        (showBalance ? `It balances at the mean: the pull from the left equals the pull from the right.` : '');

  return (
    <div className="dlab">
      <header className="head">
        <h1>Data — Where&apos;s the Center?</h1>
        <p className="lede">
          A set of numbers has a <em>shape</em> and a <em>center</em> — but &ldquo;center&rdquo; means three
          different things. Build a <span className="mono">dot plot</span>, then meet the{' '}
          <em>mode</em>, the <em>median</em>, and the <em>mean</em> — and discover why the mean is the one
          spot where the data <em>balances</em>. Each lens unlocks with the lesson, so the picture is never
          ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <DataEquation
                meanStr={meanFmt.text}
                meanApprox={meanFmt.approx}
                exists={meanExists}
                n={n}
                showMedian={eff.median}
                medianStr={medianFmt.text}
                showMode={eff.mode}
                modeStr={modeStr}
                showRange={eff.range}
                rangeStr={rangeStr}
              />
            </p>
            <p className="equation-sub mono">
              {meanExists ? (
                <>
                  mean = ({data.length ? sum : 0}) ÷ {n}
                  {showBalance ? (
                    <>
                      {' '}
                      &nbsp;·&nbsp; balance: <b className="carm">{pullFmt.text}</b> left ={' '}
                      <b className="carm">{pullFmt.text}</b> right
                    </>
                  ) : null}
                </>
              ) : (
                'add points to see the center'
              )}
            </p>
          </div>

          <div
            className={'stage' + (showTowers ? ' has-towers' : '')}
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">click to add · click a dot to remove · drag to move</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ` Calibrated — your mean balances on the target of ${targetMean}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Mean</span>
              <span className="fact-v mono carm big">
                {meanExists ? (meanFmt.approx ? '≈ ' : '') + meanFmt.text : '—'}
              </span>
            </div>
            <div className="fact">
              <span className="fact-k">Median</span>
              <span className="fact-v mono blue">{meanExists ? medianFmt.text : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Mode</span>
              <span className="fact-v mono gold">{meanExists ? modeStr : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Range</span>
              <span className="fact-v mono">{rangeStr}</span>
            </div>
          </div>

          <div className="toolbar">
            {showTowers && (
              <button
                type="button"
                className={'btn ghost' + (levelOn ? ' on' : '')}
                onClick={() => setLevelOn((f) => !f)}
                disabled={n === 0}
              >
                {levelOn ? 'Leveled' : 'Level'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => applyPreset([2, 3, 4, 4, 5, 5, 5, 6, 7, 8])}>
              Symmetric
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 2, 2, 3, 3, 3, 4, 10])}>
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

          <div className="lenses" role="group" aria-label="Measure lenses">
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
                    {n < 3 ? 'need ≥ 3 dots' : 'aim the mean at ' + targetMean}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setData([]);
                  if (levelOn) setLevelOn(false);
                  levelTRef.current = 0;
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
                  setLevelOn(false);
                  levelTRef.current = 0;
                  setLensOn({ mode: false, median: false, mean: false, range: false });
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
          mean = (Σx) ÷ n &nbsp;·&nbsp; median = middle value &nbsp;·&nbsp; mode = most frequent &nbsp;·&nbsp; range = max − min
        </span>{' '}
        &nbsp;·&nbsp; the mean is the balance point: Σ(x − mean) = 0 (CCSS 6.SP). Data here are whole numbers 0–10; the
        same ideas scale to any values.
      </footer>

      <style jsx>{`
        .dlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --median: #3f74a6;
          --mode: #d9982b;
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
          max-width: 70ch;
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
        }
        .equation-sub .carm {
          color: var(--curve);
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
          transition: none;
        }
        /* the fair-share towers appear with the mean step — grow the box to fit */
        .stage.has-towers {
          aspect-ratio: 8 / 6.4;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
          .stage.has-towers {
            aspect-ratio: 3 / 4;
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
          color: var(--median);
          font-weight: 600;
        }
        .fact-v.gold {
          color: #b07a17;
          font-weight: 600;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
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
        .btn.ghost.on {
          background: var(--curve);
          border-color: var(--curve);
          color: #fff;
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
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
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
        :global(.dlab) :focus-visible {
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
