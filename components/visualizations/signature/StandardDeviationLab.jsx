'use client';

/* ============================================================================
   StandardDeviationLab — an interactive "bench" for STANDARD DEVIATION: the
   number that measures how far, TYPICALLY, a data set spreads from its mean.

   The thesis of the lab is the deepest truth of the standard deviation, told as
   a picture instead of a formula: σ is the SIDE of the square whose AREA is the
   AVERAGE of the squared deviations.  That single sentence explains the whole
   ritual —
       • we SQUARE each distance-from-the-mean so signs cannot cancel (a point 3
         to the left and a point 3 to the right both count as spread, not zero)
         and so far points count much more (twice as far ⇒ four times the area);
       • we AVERAGE those squares — that average area is the VARIANCE;
       • we take the SQUARE ROOT to climb back down from "squared units" to the
         data's own units — and geometrically, the square root of an area is the
         side of a square.  That side is the standard deviation.
   So σ is, literally, the typical distance from the mean: the root-mean-square
   distance.  The lab lets a student build the squares, watch them pour into one
   average square, and read its side off the number line as the ± σ band.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at High-School
   Statistics (CCSS.MATH.HSS-ID.A.2: "compare center (median, mean) and spread
   (interquartile range, standard deviation) of two or more data sets"; HSS-ID.A.3
   on the effect of outliers on spread).  The natural SEQUEL to DataLab: that lab
   ended on "the mean is the balance point"; this one asks the very next question —
   once you know the center, how SPREAD OUT is the data around it?  Range used
   only two points; standard deviation uses every one.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   lenses that unlock one per lesson step, predict-then-check questions gated on
   ANSWERED not correct, and a calibration challenge with a live match meter and
   a CALIBRATED stamp.  Two linked pictures of one data set (the family signature,
   retuned for spread):
     • the DOT PLOT (top) — each dot a data point on a number line, the blue mean
       as a fulcrum, gray deviation segments from every dot to the mean, and — the
       carmine star — the ± σ BAND, one standard deviation shaded on each side.
     • the SQUARES STRIP (bottom, revealed with the Squares lens) — each deviation
       drawn as a literal SQUARE of area (xᵢ−mean)².  "Equalize" pours all the
       squares into n equal squares whose common side is σ: the average square.

   One-accent discipline: CARMINE is the mathematical object this lab reveals —
   the STANDARD DEVIATION.  The ± σ band, the deviation-squares, the average
   square, the σ marker and the σ readout are all carmine.  Everything else is a
   quiet supporting hue so it never fights the accent: the MEAN (a prerequisite,
   not the star) is calm BLUE; the raw DEVIATIONS are neutral SLATE; the target
   band in calibration is grey; GREEN is reserved for "correct" and "CALIBRATED".

   Correctness — every statistic is EXACT integer arithmetic, so a K-12 student
   never meets a float artefact like 2.2360000004:
     • data values are integers 0…10.
     • VARIANCE (population) = (n·Σxᵢ² − (Σxᵢ)²) / n² — an exact reduced fraction.
       Writing Nv = n·Σxᵢ² − (Σxᵢ)² (a non-negative integer), the sum of squared
       deviations Σ(xᵢ−μ)² = Nv/n and the variance = Nv/n², both rendered as an
       integer, an exact terminating decimal, or a clearly-marked "≈" rounding.
     • STANDARD DEVIATION σ = √Nv / n.  It is exact when Nv is a perfect square
       (then σ = isqrt(Nv)/n, shown exactly); otherwise it is irrational and shown
       with a "≈".  The irrational value is used ONLY for pixels and the meter —
       never for a pass/fail.
     • Σ(xᵢ − μ) = 0 is checked in ×n integer units (Σ(xᵢ·n − Σx) = 0), so the
       "the deviations cancel" claim is exact.
     • "within 1 SD" is counted with the exact integer test (n·xᵢ − Σx)² ≤ Nv
       (squaring |xᵢ−μ| ≤ σ), so it never wobbles on a rounding boundary.
     • CALIBRATION is an EXACT integer hit: σ = T (an integer target) ⟺
       n·Σxᵢ² − (Σxᵢ)² = T²·n².  No float decides whether a student succeeded.

   NOTE on the ÷n vs ÷(n−1) fork: this lab teaches the POPULATION standard
   deviation (divide by n), because then σ is EXACTLY the root-mean-square distance
   from the mean — which is the whole visual story (the average square, the ± σ
   band).  The SAMPLE standard deviation divides the sum of squares by (n−1)
   (Bessel's correction) to estimate a larger population from a sample; that is a
   later, more advanced idea and is flagged in the footer.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/StandardDeviationLab.jsx
     2. Import and render it:
          import StandardDeviationLab from './StandardDeviationLab';
          export default function Page() { return <StandardDeviationLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js), so
   nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the data array, which
              lenses are on, the lesson step, the calibration target).
     MODEL  — the statistics are exact integer arithmetic; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change (DPI-aware).
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The "dials" are LENSES, not sliders: the data is built
   by clicking the number line, and each lens (Deviations, Squares, Variance,
   Std Dev) unlocks one per lesson step and adds one layer to the picture — so
   the image never runs ahead of the idea.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 10; // number line runs 0…10
const MAX_POINTS = 12; // total dots
const MAX_STACK = 8; // dots in one column

// A friendly starting set: a natural mound, mean 5.5, and — chosen on purpose —
// an EXACT standard deviation of 1.5 (Nv = 144 = 12²) so the first thing a
// student sees is clean, not 1.4983….   3,4,5,5,6,6,7,8
const START_DATA = [3, 4, 5, 5, 6, 6, 7, 8];

const STEP_SPREAD = 0; // meet spread — range isn't enough; build a dot plot
const STEP_DEV = 1; // deviation = distance from the mean (and it sums to 0)
const STEP_SQUARES = 2; // square each deviation; the sum of squares
const STEP_VAR = 3; // variance = the average square
const STEP_SD = 4; // standard deviation = the side of that square (± σ band)
const STEP_READ = 5; // reading spread; the outlier effect
const STEP_CALIB = 6; // build a set with the target σ (calibration)

// the lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'dev', unlock: STEP_DEV, color: '#5b6b7b', name: 'Deviations', role: 'distance from the mean' },
  { key: 'squares', unlock: STEP_SQUARES, color: '#c81e4f', name: 'Squares', role: 'each deviation, squared' },
  { key: 'variance', unlock: STEP_VAR, color: '#c81e4f', name: 'Variance', role: 'the average square' },
  { key: 'sd', unlock: STEP_SD, color: '#c81e4f', name: 'Std Dev', role: 'the ± σ band' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The statistics, EXACT.  Everything is derived from the
   integer data array; nothing here knows a pixel.
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
// exact terminating decimal for num/den by integer long division; guarded.
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
  const frac = ((H % 100) + 100) % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact decimal, or "≈" 2-dp rounding
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
// integer square root (exact); returns the floor of √n for n ≥ 0
function isqrt(n) {
  if (n < 0) return -1;
  let x = Math.floor(Math.sqrt(n));
  while (x > 0 && x * x > n) x--;
  while ((x + 1) * (x + 1) <= n) x++;
  return x;
}
// format a non-negative float to exactly 2 decimals (for irrational σ display)
function round2Str(x) {
  const H = Math.round(x * 100);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}

/* Everything about a data set, computed exactly.

   Key integer:  Nv = n·Σx² − (Σx)²  ( = n·Σ(xᵢ−μ)², always ≥ 0 ).
     Σ(xᵢ−μ)²  = Nv / n        (sum of squared deviations)
     variance  = Nv / n²       (population; the average squared deviation)
     σ         = √Nv / n       (population standard deviation)
*/
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const ss = data.reduce((a, b) => a + b * b, 0); // Σx²
  const sorted = [...data].sort((a, b) => a - b);
  const minV = n ? sorted[0] : 0;
  const maxV = n ? sorted[n - 1] : 0;
  const Nv = n ? n * ss - sum * sum : 0; // n·Σ(x−μ)²
  // within 1 SD, exact:  |xᵢ − μ| ≤ σ  ⟺  (n·xᵢ − sum)² ≤ Nv
  let within = 0;
  if (n) for (const v of data) if ((n * v - sum) * (n * v - sum) <= Nv) within++;
  return { n, sum, ss, sorted, minV, maxV, Nv, within };
}

// exact display strings for the spread statistics
function spreadStrings(n, sum, Nv) {
  if (n === 0) {
    return { mean: '—', ssDev: '—', variance: '—', sigma: '—', sigmaApprox: false, meanApprox: false, varApprox: false };
  }
  const meanFmt = fmtRatio(sum, n);
  const ssDevFmt = fmtRatio(Nv, n); // Σ(x−μ)²
  const varFmt = fmtRatio(Nv, n * n); // variance
  // σ = √Nv / n : exact iff Nv is a perfect square
  const r = isqrt(Nv);
  let sigmaFmt;
  if (r * r === Nv) {
    const f = fmtRatio(r, n); // rational — may still be a repeating decimal → approx flag
    sigmaFmt = { text: f.text, approx: f.approx };
  } else {
    sigmaFmt = { text: round2Str(Math.sqrt(Nv) / n), approx: true };
  }
  return {
    mean: meanFmt.text,
    meanApprox: meanFmt.approx,
    ssDev: ssDevFmt.text,
    ssDevApprox: ssDevFmt.approx,
    variance: varFmt.text,
    varApprox: varFmt.approx,
    sigma: sigmaFmt.text,
    sigmaApprox: sigmaFmt.approx,
  };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's alternative to
   curve-matching): a grey target ± σ band of a whole-number width T is fixed on
   the number line; the student builds ANY data set (≥ 2 points) whose carmine σ
   band exactly matches it.  There are many winning sets — every arrangement whose
   root-mean-square distance from its own mean equals T — which is the point.  The
   meter reads closeness in value-units; CALIBRATED is an EXACT integer hit:
       σ = T   ⟺   n·Σx² − (Σx)² = T²·n².
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 2.0; // value-units of σ error spread across the meter
const matchPercent = (sigmaVal, exists, T) =>
  exists ? 100 * Math.max(0, 1 - Math.abs(sigmaVal - T) / MATCH_SCALE) : 0;
const isCalibrated = (n, Nv, T) => n >= 2 && Nv === T * T * n * n;

function makeTarget(prev) {
  let t;
  do {
    t = 1 + Math.floor(Math.random() * 3); // integer σ target 1, 2, or 3
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The STANDARD DEVIATION is the star, in carmine;
   the mean and variance ride along as quiet chips.  Rendered by a CHILD
   component, so styles are INLINED (styled-jsx only scopes a component's own
   JSX) — identical in Next.js and in any plain preview harness.
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
function SDEquation({ sigma, sigmaApprox, exists, n, meanStr, showVar, varStr, varApprox }) {
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
          {exists ? (sigmaApprox ? '≈ ' : '') + sigma : '—'}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#5b6b7b',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          σ · std dev
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
      <span style={{ ...CHIP_BASE, color: '#2f6091', background: 'rgba(63,116,166,0.13)' }}>mean {meanStr}</span>
      {showVar && (
        <span style={{ ...CHIP_BASE, color: '#a12240', background: 'rgba(200,30,79,0.12)' }}>
          {varApprox ? 'σ² ≈ ' : 'σ² = '}
          {varStr}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the lens unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   misconceptions ("σ ignores outliers," "distance is distance so don't square,"
   "just average the deviations").  Next is gated on ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Spread — how far from the center?',
    body:
      'The mean tells you WHERE the data centers. Spread tells you how SCATTERED it is around that ' +
      'center. Range (max − min) uses only the two most extreme points, so two very different data ' +
      'sets can share a range. Standard deviation does better: it measures the TYPICAL distance from ' +
      'the mean, using every point. Build a dot plot — the blue mean is your reference.',
    q: 'Two classes both average 80 on a test. Class A everyone scored 78–82; Class B half scored 60 and half 100. Which class has the larger spread?',
    choices: [
      'Class B — its scores sit far from the mean',
      'They are equal — both average 80',
      'Class A — it has more different scores',
    ],
    answer: 0,
    feedback:
      'Same center, very different spread. Class A hugs 80; Class B is flung far from it. Standard ' +
      'deviation is built to tell these apart — it asks how far the points typically fall from the ' +
      'mean, which the mean alone can never reveal.',
  },
  {
    title: 'Deviation — distance from the mean',
    body:
      'A point’s DEVIATION is how far it sits from the mean: dᵢ = xᵢ − μ. Points left of the mean have ' +
      'negative deviations, points right have positive ones — the gray segments show each distance. ' +
      'Here is the trap: if you just ADD the deviations you always get exactly zero (that is the mean’s ' +
      'balance property). So the raw deviations cannot, by themselves, measure spread.',
    q: 'Why can’t we measure spread by averaging the raw deviations xᵢ − μ?',
    choices: [
      'They always sum to zero — the negatives cancel the positives',
      'Because the deviations are always positive',
      'Because dividing by n is unfair to big data sets',
    ],
    answer: 0,
    feedback:
      'Σ(xᵢ − μ) = 0 for every data set — the mean is exactly the balance point, so left and right ' +
      'deviations cancel. Their average is always 0, telling us nothing. We need a way to stop the ' +
      'cancellation. That is the next step.',
  },
  {
    title: 'Square each deviation',
    body:
      'The fix is to SQUARE every deviation. Squaring does two jobs at once: it makes every value ' +
      'positive, so a step left and a step right both count as spread (no more cancelling); and it makes ' +
      'far points count much more — a point twice as far contributes four times as much. Each squared ' +
      'deviation is drawn as a real SQUARE of area dᵢ². Add them: the sum of squares, SS = Σ(xᵢ − μ)².',
    q: 'One point is 3 units from the mean; another is 1 unit from the mean. How do their SQUARED contributions compare?',
    choices: [
      '9 to 1 — the far point contributes nine times as much',
      '3 to 1 — the same as their distances',
      'Equal — a distance is a distance',
    ],
    answer: 0,
    feedback:
      '3² = 9 and 1² = 1, so the far point adds nine times as much to the sum of squares. Squaring is ' +
      'what makes standard deviation sensitive to points far from the mean — outliers move it a lot, as ' +
      'you will see.',
  },
  {
    title: 'Variance — the average square',
    body:
      'The VARIANCE is the AVERAGE of those squares: σ² = SS ÷ n — the area of the typical square. Press ' +
      '“Equalize” to pour all the squares into n equal squares; the common size they reach is the ' +
      'average square, and its area is the variance. One catch: variance is in SQUARED units — if the ' +
      'data are in points, variance is in points². That is awkward to compare to the data.',
    q: 'For the data 2, 4, 6 (mean 4), the squared deviations are 4, 0, 4. What is the variance?',
    choices: [
      '8 ÷ 3 ≈ 2.67 — the average of 4, 0, 4',
      '8 — the sum 4 + 0 + 4',
      '2 — the square root of something',
    ],
    answer: 0,
    feedback:
      'Deviations −2, 0, +2 square to 4, 0, 4; their sum is 8 and their average is 8 ÷ 3 ≈ 2.67. That ' +
      'average is the variance. It measures spread, but in squared units — so the next step brings us ' +
      'back to the data’s own units.',
  },
  {
    title: 'Standard deviation — back to real units',
    body:
      'To undo the squaring, take the SQUARE ROOT of the variance: σ = √(σ²). Geometrically the square ' +
      'root of an area is the SIDE of the square — so σ is the side of that average square. It is back ' +
      'in the data’s own units and it is the TYPICAL distance from the mean. The carmine band shows ' +
      'μ ± σ: one standard deviation on each side. Points inside the band are within a typical distance.',
    q: 'A data set has variance 25 (in points²). What is its standard deviation?',
    choices: [
      '5 points — the square root of 25',
      '25 points — variance and σ are the same',
      '625 points — square the variance',
    ],
    answer: 0,
    feedback:
      'σ = √25 = 5 points. The square root pulls us from squared units (points²) back to real units ' +
      '(points), so σ can be compared directly to the data. A typical value sits about 5 points from ' +
      'the mean.',
  },
  {
    title: 'Reading the spread — and outliers',
    body:
      'σ has the same units as the data, so you can read it directly: a small σ means the dots hug the ' +
      'mean (narrow band, tiny squares); a large σ means they scatter (wide band, big squares). Now test ' +
      'it: drag one dot far away to make an OUTLIER and watch σ jump — because that point’s squared ' +
      'deviation is huge. Like the mean, standard deviation is pulled hard by extreme values.',
    q: 'You drag one point far from the rest. What happens to the standard deviation?',
    choices: [
      'It grows a lot — that point’s squared deviation is large',
      'It stays the same — σ ignores outliers',
      'It shrinks — one point matters less in a bigger spread',
    ],
    answer: 0,
    feedback:
      'σ grows sharply, because squaring gives a faraway point an outsized squared deviation. That ' +
      'sensitivity is why, for skewed data like incomes or home prices, people often report the median ' +
      'and the interquartile range instead — measures that resist outliers.',
  },
  {
    title: 'Build the target spread',
    body:
      'Final challenge. A grey target band of width σ = T is fixed on the number line. Build a data set — ' +
      'at least 2 dots — whose carmine σ band matches it exactly. There are many winning sets: any ' +
      'arrangement whose typical distance from its own mean equals T (a symmetric pair at ±T is the ' +
      'simplest). The meter reads CALIBRATED the moment your σ lands on the target. Press “New target” ' +
      'for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function StandardDeviationLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // target σ during calibration
  const [equalizeOn, setEqualizeOn] = useState(false); // pour-into-average-square animation
  const [lensOn, setLensOn] = useState({ dev: false, squares: false, variance: false, sd: false });
  const [keyboardPoint, setKeyboardPoint] = useState(0);
  const [keyboardAddValue, setKeyboardAddValue] = useState(5);

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const dataRef = useRef(data); // latest data for pointer handlers
  const grabRef = useRef(null); // { i, startVal, moved } while dragging a dot
  const hoverColRef = useRef(null); // hovered add-column (integer value) or null
  const eqTRef = useRef(0); // 0..1 equalize progress

  dataRef.current = data;

  const current = STEPS[step];
  const calib = !!current.calib;

  const st = computeStats(data);
  const { n, sum, minV, maxV, Nv, within } = st;
  const exists = n > 0;
  const meanVal = n > 0 ? sum / n : 0;
  const sigmaVal = n > 0 ? Math.sqrt(Nv) / n : 0; // float — pixels & meter ONLY

  const S = spreadStrings(n, sum, Nv);

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    dev: lensOn.dev && step >= STEP_DEV,
    squares: lensOn.squares && step >= STEP_SQUARES,
    variance: lensOn.variance && step >= STEP_VAR,
    sd: lensOn.sd && step >= STEP_SD,
  };
  const showSquares = eff.squares; // the bottom strip rides with the Squares lens

  const targetSigma = calib && target != null ? target : null;
  const matchPct = targetSigma != null ? matchPercent(sigmaVal, exists, targetSigma) : 0;
  const calibrated = targetSigma != null ? isCalibrated(n, Nv, targetSigma) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer / animation handlers never read stale values.
  sceneRef.current = {
    data,
    n,
    sum,
    minV,
    maxV,
    Nv,
    within,
    meanVal,
    sigmaVal,
    eff,
    showSquares,
    calib,
    targetSigma,
    calibrated,
    sigmaText: (S.sigmaApprox ? '≈ ' : '') + S.sigma,
    varText: (S.varApprox ? '≈ ' : '') + S.variance,
    meanText: (S.meanApprox ? '≈ ' : '') + S.mean,
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
    const CARMINE = '#C81E4F'; // the STANDARD DEVIATION — band, squares, σ marker
    const CARM_FILL = 'rgba(200,30,79,0.12)';
    const CARM_MID = 'rgba(200,30,79,0.55)';
    const BLUE = '#3F74A6'; // the MEAN (reference)
    const SLATE = '#5B6B7B'; // raw deviations
    const DOT = 'rgba(28,43,58,0.80)'; // a plain data dot
    const AXIS = 'rgba(28,43,58,0.55)';
    const GREY = 'rgba(91,107,123,0.9)'; // calibration target

    const Sc = sceneRef.current;
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
    const pxPerUnit = spanW / (VMAX - VMIN);

    // when the squares strip shows, the dot plot takes the top ~46%; otherwise it
    // sits lower so the plot breathes.
    const plotTop = 40;
    const plotBottom = Sc.showSquares ? Math.round(Hd * 0.47) : Math.round(Hd * 0.66);
    const baseY = plotBottom; // the number line
    const cellW = spanW / (VMAX - VMIN);
    const meanX = xOf(Sc.meanVal);

    /* caption above the dot plot (shortened on narrow canvases so it never clips) */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(Wd < 520 ? 'dot plot — spread' : 'dot plot — spread around the mean', padL, 10);

    /* ---- ± σ band (Std-Dev lens): shaded region μ ± σ --------------------- */
    if (Sc.eff.sd && Sc.n > 0 && Sc.sigmaVal > 0) {
      const xLo = Math.max(xOf(Sc.meanVal - Sc.sigmaVal), padL);
      const xHi = Math.min(xOf(Sc.meanVal + Sc.sigmaVal), Wd - padR);
      ctx.fillStyle = CARM_FILL;
      ctx.fillRect(xLo, plotTop, xHi - xLo, baseY - plotTop);
      // edges
      ctx.strokeStyle = CARM_MID;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xOf(Sc.meanVal - Sc.sigmaVal), plotTop);
      ctx.lineTo(xOf(Sc.meanVal - Sc.sigmaVal), baseY);
      ctx.moveTo(xOf(Sc.meanVal + Sc.sigmaVal), plotTop);
      ctx.lineTo(xOf(Sc.meanVal + Sc.sigmaVal), baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      // ± σ tick labels just under the band top
      ctx.fillStyle = '#a12240';
      ctx.font = '700 10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (xOf(Sc.meanVal - Sc.sigmaVal) > padL + 12) ctx.fillText('μ−σ', xOf(Sc.meanVal - Sc.sigmaVal), plotTop + 3);
      if (xOf(Sc.meanVal + Sc.sigmaVal) < Wd - padR - 12) ctx.fillText('μ+σ', xOf(Sc.meanVal + Sc.sigmaVal), plotTop + 3);
      // within-1-SD readout
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('within 1σ: ' + Sc.within + ' of ' + Sc.n, Wd - padR, plotTop + 3);
    }

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
    const stepY = availStackH / MAX_STACK; // vertical spacing per stacked dot
    let dotR = Math.min(cellW * 0.36, stepY * 0.46, 12);
    dotR = Math.max(5, dotR);

    const colCount = new Map();
    const dots = [];
    Sc.data.forEach((v, i) => {
      const j = colCount.get(v) || 0;
      colCount.set(v, j + 1);
      const x = xOf(v);
      const y = baseY - 10 - dotR - j * stepY;
      dots.push({ i, x, y, r: dotR, val: v });
    });

    // hovered add-column highlight (light vertical band)
    if (Sc.hoverCol != null) {
      const X = xOf(Sc.hoverCol);
      ctx.fillStyle = 'rgba(63,116,166,0.10)';
      ctx.fillRect(X - cellW / 2, plotTop, cellW, baseY - plotTop);
    }

    /* ---- DEVIATION segments (Deviations lens): dot → mean ------------------ */
    if (Sc.eff.dev && Sc.n > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.75)';
      ctx.lineWidth = 1.4;
      for (const d of dots) {
        if (Math.abs(d.val - Sc.meanVal) < 1e-9) continue;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(meanX, d.y);
        ctx.stroke();
        // small tick where the deviation meets the mean line
        const dir = d.x > meanX ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(meanX, d.y);
        ctx.lineTo(meanX - dir * 4, d.y - 3);
        ctx.moveTo(meanX, d.y);
        ctx.lineTo(meanX - dir * 4, d.y + 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- the data dots ---------------------------------------------------- */
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = DOT;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(251,251,248,0.9)';
      ctx.stroke();
    }

    /* ---- MEAN fulcrum + marker (blue, the reference center) --------------- */
    if (Sc.n > 0) {
      ctx.save();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(meanX, plotTop);
      ctx.lineTo(meanX, baseY);
      ctx.stroke();
      // triangular fulcrum below the line
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.moveTo(meanX, baseY + 2);
      ctx.lineTo(meanX - 9, baseY + 16);
      ctx.lineTo(meanX + 9, baseY + 16);
      ctx.closePath();
      ctx.fill();
      // "mean μ" pill above the plot
      const pill = 'mean ' + Sc.meanText;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 20;
      const half = bw / 2 + 4;
      const px = Math.min(Math.max(meanX, padL + half), Wd - padR - half);
      const pillY = plotTop - 24;
      const bxp = px - bw / 2;
      const rr = 6;
      ctx.beginPath();
      ctx.moveTo(bxp + rr, pillY);
      ctx.arcTo(bxp + bw, pillY, bxp + bw, pillY + bh, rr);
      ctx.arcTo(bxp + bw, pillY + bh, bxp, pillY + bh, rr);
      ctx.arcTo(bxp, pillY + bh, bxp, pillY, rr);
      ctx.arcTo(bxp, pillY, bxp + bw, pillY, rr);
      ctx.closePath();
      ctx.fillStyle = BLUE;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill, px, pillY + bh / 2 + 0.5);
      ctx.restore();
    }

    /* ---- calibration TARGET band (grey, fixed) ---------------------------- */
    if (Sc.calib && Sc.targetSigma != null && Sc.n > 0) {
      const xLo = xOf(Sc.meanVal - Sc.targetSigma);
      const xHi = xOf(Sc.meanVal + Sc.targetSigma);
      ctx.save();
      ctx.strokeStyle = GREY;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(xLo, plotTop - 2);
      ctx.lineTo(xLo, baseY + 6);
      ctx.moveTo(xHi, plotTop - 2);
      ctx.lineTo(xHi, baseY + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = GREY;
      ctx.font = '700 10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target width σ = ' + Sc.targetSigma, meanX, plotTop - 6);
      ctx.restore();
    }

    // empty-state prompt
    if (Sc.n === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click the number line to add data points', (padL + Wd - padR) / 2, (plotTop + baseY) / 2);
    }

    /* ====================== SQUARES STRIP (bottom) ======================= */
    if (Sc.showSquares) {
      const sTop = plotBottom + 52;
      const sBottom = Hd - 20;
      const stripH = sBottom - sTop;
      const stripL = padL;
      const stripW = Wd - padL - padR;

      // caption
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        Wd < 560 ? 'squares: area = (xᵢ − mean)²' : 'squares — area = (xᵢ − mean)²   ·   σ = side of the average square',
        stripL,
        sTop - 6,
      );

      if (Sc.n > 0 && Sc.Nv > 0) {
        // exact deviation side per point, in value-units:  |n·xᵢ − sum| / n
        const sortedVals = [...Sc.data].sort((a, b) => a - b);
        const t = eqTRef.current; // 0..1 equalize progress
        const sides = sortedVals.map((v) => Math.abs(Sc.n * v - Sc.sum) / Sc.n);
        const sigmaSide = Sc.sigmaVal;
        // during equalize, every side eases toward σ
        const sideNow = sides.map((s) => s + (sigmaSide - s) * t);
        const maxSideEver = Math.max(sigmaSide, ...sides, 1e-6);

        const slotW = stripW / Sc.n;
        // scale so the biggest square fits both its slot width and the strip height
        const scale = Math.min((stripH - 6) / maxSideEver, (slotW * 0.84) / maxSideEver);

        // σ reference line across the strip (the average square's side height)
        const sigmaY = sBottom - sigmaSide * scale;
        if (Sc.eff.variance || Sc.eff.sd) {
          ctx.save();
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 4]);
          ctx.beginPath();
          ctx.moveTo(stripL, sigmaY);
          ctx.lineTo(Wd - padR, sigmaY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = CARMINE;
          ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText('σ = ' + Sc.sigmaText, Wd - padR, sigmaY - 3);
          ctx.restore();
        }

        // the squares
        for (let k = 0; k < Sc.n; k++) {
          const side = sideNow[k] * scale;
          const cx = stripL + slotW * (k + 0.5);
          const x0 = cx - side / 2;
          const y0 = sBottom - side;
          ctx.fillStyle = CARM_FILL;
          ctx.fillRect(x0, y0, side, side);
          ctx.strokeStyle = CARM_MID;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(side - 1, 0), Math.max(side - 1, 0));
        }
        // baseline for the squares to sit on
        ctx.strokeStyle = 'rgba(28,43,58,0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stripL, sBottom + 0.5);
        ctx.lineTo(Wd - padR, sBottom + 0.5);
        ctx.stroke();
      } else if (Sc.n > 0) {
        // Nv === 0 : no spread at all
        ctx.fillStyle = INK_SOFT;
        ctx.font = '600 12.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('every point equals the mean — no spread, so σ = 0', (stripL + Wd - padR) / 2, (sTop + sBottom) / 2);
      }
    }

    /* store geometry for hit-testing */
    geoRef.current = { padL, spanW, baseY, plotTop, cellW, dotR, dots };
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [data, step, target, lensOn, equalizeOn, draw]);

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

  /* set up the calibration target the first time we reach it; start empty so the
     build is clearly un-matched, and make sure the σ band is visible. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setData([]);
      setLensOn((prev) => ({ ...prev, squares: true, variance: true, sd: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* the equalize animation — time-based, opt-in, reduced-motion aware */
  useEffect(() => {
    const wantsReduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetT = equalizeOn ? 1 : 0;
    if (wantsReduce) {
      eqTRef.current = targetT;
      draw();
      return;
    }
    let raf;
    let last = null;
    const speed = 1.6; // per second
    const loop = (now) => {
      if (last == null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      const cur = eqTRef.current;
      const next = cur + Math.sign(targetT - cur) * speed * dt;
      eqTRef.current = Math.abs(next - targetT) <= speed * dt ? targetT : next;
      draw();
      if (eqTRef.current !== targetT) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [equalizeOn, data, step, draw]);

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
        if (countOf(arr, v) >= MAX_STACK && v !== grab.startVal) return; // target column full
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
        const arr = dataRef.current;
        setData(arr.filter((_, k) => k !== grab.i)); // click with no drag = remove
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

  const selectedPoint = data.length > 0 ? Math.min(keyboardPoint, data.length - 1) : -1;
  const selectedValue = selectedPoint >= 0 ? data[selectedPoint] : VMIN;
  const setSelectedValue = (rawValue) => {
    if (selectedPoint < 0) return;
    const value = clampVal(Math.round(rawValue));
    setData((arr) => {
      const i = Math.min(selectedPoint, arr.length - 1);
      if (i < 0 || (value !== arr[i] && countOf(arr, value) >= MAX_STACK)) return arr;
      const next = arr.slice();
      next[i] = value;
      return next;
    });
  };
  const addPointWithKeyboard = () => {
    const value = clampVal(Math.round(keyboardAddValue));
    setData((arr) => (arr.length < MAX_POINTS && countOf(arr, value) < MAX_STACK ? [...arr, value] : arr));
    setKeyboardPoint(data.length);
  };
  const removeSelectedPoint = () => {
    if (selectedPoint < 0) return;
    setData((arr) => arr.filter((_, i) => i !== Math.min(selectedPoint, arr.length - 1)));
  };

  /* ---- toolbar / presets ------------------------------------------------- */
  const applyPreset = (arr) => {
    if (equalizeOn) setEqualizeOn(false);
    eqTRef.current = 0;
    setData(arr.slice(0, MAX_POINTS));
  };
  const randomSet = () => {
    const k = 6 + Math.floor(Math.random() * 5); // 6…10 points
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
    applyPreset(arr);
  };
  const clearData = () => applyPreset([]);

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
      : `A data set of ${n} value${n === 1 ? '' : 's'}, mean ${S.meanApprox ? 'about ' : ''}${S.mean}. ` +
        `The standard deviation is ${S.sigmaApprox ? 'about ' : ''}${S.sigma}` +
        (eff.variance ? `, and the variance is ${S.varApprox ? 'about ' : ''}${S.variance}` : '') +
        '. ' +
        (eff.sd && sigmaVal > 0 ? `${within} of the ${n} points lie within one standard deviation of the mean.` : '');

  return (
    <div className="sdlab">
      <header className="head">
        <h1>Standard Deviation — How Spread Out?</h1>
        <p className="lede">
          The mean says where data <em>centers</em>; the standard deviation says how far it typically{' '}
          <em>spreads</em>. Build a <span className="mono">dot plot</span>, turn each point&rsquo;s distance from the
          mean into a <em>square</em>, pour the squares into one <em>average square</em> — and read its side: that side
          is <span className="carm">σ</span>, the typical distance from the mean. Each lens unlocks with the lesson, so
          the picture is never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <SDEquation
                sigma={S.sigma}
                sigmaApprox={S.sigmaApprox}
                exists={exists}
                n={n}
                meanStr={exists ? (S.meanApprox ? '≈ ' + S.mean : S.mean) : '—'}
                showVar={eff.variance}
                varStr={S.variance}
                varApprox={S.varApprox}
              />
            </p>
            <p className="equation-sub mono">
              {exists ? (
                <>
                  σ = √( Σ(x−mean)² ÷ n ) = √<span className="carm">{S.variance}</span>
                  {eff.sd && sigmaVal > 0 ? (
                    <>
                      {' '}
                      &nbsp;·&nbsp; within 1σ: <b className="carm">{within}</b> of {n}
                    </>
                  ) : null}
                </>
              ) : (
                'add points to measure the spread'
              )}
            </p>
          </div>

          <div
            className={'stage' + (showSquares ? ' has-squares' : '')}
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
            {calib && calibrated ? ` Calibrated — your standard deviation matches the target of ${targetSigma}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Std dev σ</span>
              <span className="fact-v mono carm big">{exists ? (S.sigmaApprox ? '≈ ' : '') + S.sigma : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Variance σ²</span>
              <span className="fact-v mono carm">{exists ? (S.varApprox ? '≈ ' : '') + S.variance : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Mean μ</span>
              <span className="fact-v mono blue">{exists ? (S.meanApprox ? '≈ ' : '') + S.mean : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Σ(x−μ)²</span>
              <span className="fact-v mono">{exists ? (S.ssDevApprox ? '≈ ' : '') + S.ssDev : '—'}</span>
            </div>
          </div>

          <div
            className="keyboard-editor"
            role="group"
            aria-label="Keyboard data-point editor"
            data-viz-keyboard-equivalent="standard-deviation-data-points"
          >
            <span className="editor-title">Edit data without dragging</span>
            <label className="editor-field">
              <span>Point</span>
              <select
                value={selectedPoint >= 0 ? selectedPoint : ''}
                onChange={(e) => setKeyboardPoint(Number(e.target.value))}
                disabled={selectedPoint < 0}
                aria-label="Data point to edit"
              >
                {data.map((value, i) => (
                  <option key={i} value={i}>
                    {i + 1}: {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="editor-range">
              <button
                type="button"
                className="editor-step"
                onClick={() => setSelectedValue(selectedValue - 1)}
                disabled={selectedPoint < 0 || selectedValue <= VMIN || countOf(data, selectedValue - 1) >= MAX_STACK}
                aria-label="Move selected point one value left"
              >
                −1
              </button>
              <label>
                <span className="sr-only">Selected point value</span>
                <input
                  type="range"
                  min={VMIN}
                  max={VMAX}
                  step="1"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(Number(e.target.value))}
                  disabled={selectedPoint < 0}
                />
              </label>
              <output className="editor-value" aria-live="polite">
                {selectedPoint >= 0 ? selectedValue : '—'}
              </output>
              <button
                type="button"
                className="editor-step"
                onClick={() => setSelectedValue(selectedValue + 1)}
                disabled={selectedPoint < 0 || selectedValue >= VMAX || countOf(data, selectedValue + 1) >= MAX_STACK}
                aria-label="Move selected point one value right"
              >
                +1
              </button>
            </div>
            <button
              type="button"
              className="editor-action"
              onClick={removeSelectedPoint}
              disabled={selectedPoint < 0}
            >
              Remove point
            </button>
            <label className="editor-field editor-add">
              <span>New value</span>
              <input
                type="number"
                min={VMIN}
                max={VMAX}
                step="1"
                value={keyboardAddValue}
                onChange={(e) => setKeyboardAddValue(clampVal(Math.round(Number(e.target.value))))}
                aria-label="Value for new data point"
              />
            </label>
            <button
              type="button"
              className="editor-action"
              onClick={addPointWithKeyboard}
              disabled={n >= MAX_POINTS || countOf(data, keyboardAddValue) >= MAX_STACK}
            >
              Add point
            </button>
            <span className="editor-help">The slider accepts Arrow, Page Up/Down, Home, and End keys.</span>
          </div>

          <div className="toolbar">
            {showSquares && (
              <button
                type="button"
                className={'btn ghost' + (equalizeOn ? ' on' : '')}
                onClick={() => setEqualizeOn((f) => !f)}
                disabled={n === 0 || Nv === 0}
              >
                {equalizeOn ? 'Equalized' : 'Equalize'}
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => applyPreset([3, 4, 5, 5, 6, 6, 7, 8])}>
              Tight
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 1, 2, 5, 8, 9, 9])}>
              Wide
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([3, 4, 4, 4, 5, 5, 10])}>
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

          <div className="lenses" role="group" aria-label="Spread lenses">
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
                    {n < 2 ? 'need ≥ 2 dots' : 'make σ = ' + targetSigma}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTarget(makeTarget(target));
                  setData([]);
                  if (equalizeOn) setEqualizeOn(false);
                  eqTRef.current = 0;
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
                  setEqualizeOn(false);
                  eqTRef.current = 0;
                  setLensOn({ dev: false, squares: false, variance: false, sd: false });
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
          σ = √( Σ(xᵢ − μ)² ÷ n ) &nbsp;·&nbsp; variance σ² = Σ(xᵢ − μ)² ÷ n &nbsp;·&nbsp; μ = mean
        </span>{' '}
        &nbsp;·&nbsp; This is the <b>population</b> standard deviation (÷ n) — the root-mean-square distance from the
        mean. The <b>sample</b> standard deviation divides by (n − 1) instead, to estimate a larger population from a
        sample (CCSS HSS-ID.A.2). Data here are whole numbers 0–10; the ideas scale to any values.
      </footer>

      <style jsx>{`
        .sdlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --mean: #3f74a6;
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
        .carm {
          color: var(--curve);
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
        .lede .carm {
          font-style: normal;
          font-weight: 700;
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
        /* the squares strip appears with the Squares lens — grow the box to fit */
        .stage.has-squares {
          aspect-ratio: 8 / 6.6;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
          .stage.has-squares {
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
          color: var(--mean);
          font-weight: 600;
        }
        .keyboard-editor {
          margin: 12px 4px 2px;
          padding: 10px;
          display: grid;
          grid-template-columns: minmax(118px, 0.75fr) minmax(210px, 1.5fr) auto;
          gap: 8px 10px;
          align-items: center;
          border: 1px solid rgba(28, 43, 58, 0.14);
          border-radius: 9px;
          background: rgba(63, 116, 166, 0.045);
        }
        .editor-title {
          grid-column: 1 / -1;
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
        }
        .editor-field {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--ink-soft);
          font-size: 12px;
        }
        .editor-field select,
        .editor-field input[type='number'] {
          min-width: 0;
          min-height: 44px;
          width: 100%;
          padding: 5px 8px;
          border: 1px solid rgba(28, 43, 58, 0.28);
          border-radius: 7px;
          background: #fff;
          color: var(--ink);
          font: 600 13px/1.2 var(--mono);
        }
        .editor-range {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(84px, 1fr) 2ch auto;
          gap: 7px;
          align-items: center;
        }
        .editor-range label,
        .editor-range input {
          min-width: 0;
          width: 100%;
        }
        .editor-range label {
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        .editor-step,
        .editor-action {
          min-width: 44px;
          min-height: 44px;
          padding: 7px 10px;
          border: 1px solid rgba(28, 43, 58, 0.28);
          border-radius: 7px;
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          font: 650 12px/1 system-ui, sans-serif;
          white-space: nowrap;
        }
        .editor-step {
          font-family: var(--mono);
          font-weight: 700;
        }
        .editor-step:disabled,
        .editor-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .editor-value {
          color: var(--curve);
          font: 700 14px/1 var(--mono);
          text-align: center;
        }
        .editor-add {
          grid-column: 1 / 2;
        }
        .editor-help {
          grid-column: 1 / -1;
          color: var(--ink-soft);
          font-size: 11.5px;
          line-height: 1.35;
        }
        @media (max-width: 720px) {
          .keyboard-editor {
            grid-template-columns: 1fr;
          }
          .editor-range {
            grid-template-columns: 44px minmax(0, 1fr) 2ch 44px;
            gap: 4px;
          }
          .editor-add,
          .editor-title,
          .editor-help {
            grid-column: 1;
          }
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
        :global(.sdlab) :focus-visible {
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
