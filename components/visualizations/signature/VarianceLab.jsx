'use client';

/* ============================================================================
   VarianceLab — an interactive "bench" for VARIANCE: the single number that
   measures how SPREAD OUT a data set is around its mean.

   The thesis, told as a picture instead of a formula: variance is the AVERAGE
   AREA of the "deviation squares."  For every value we draw a square whose side
   is that value's distance from the mean; the variance is the average of those
   square areas — the MEAN SQUARED DEVIATION.  That one sentence explains the
   whole ritual:
       • the deviations (value − mean) always sum to ZERO, so we cannot just
         average them — the pluses and minuses cancel;
       • to keep spread from cancelling we must drop the sign, and the standard
         way is to SQUARE each deviation.  Squaring does two jobs at once: it
         makes every term positive, AND it makes distance count QUADRATICALLY —
         a point twice as far from the mean contributes FOUR times as much;
       • the AVERAGE of those squares is the variance.  Because we averaged
         squared distances, the variance is in SQUARED units.

   The signature this lab owns (no sibling has it): a live DUEL between the two
   honest ways to remove the sign —
       MAD  = mean of the |deviations|   (average DISTANCE, a length, linear)
       Var  = mean of the (deviations)²  (average SQUARED distance, an area,
                                          quadratic)
   Drag a point outward and watch the amber MAD grow like a length while the
   carmine variance balloons like an area: that contrast is the answer to the
   deepest question a student has here, "why do we square?".

   Two further truths of variance are made interactive:
       • the shortcut identity  variance = mean(x²) − (mean x)²   ("the mean of
         the squares minus the square of the mean"), which updates live;
       • variance depends ONLY on distances from the mean: SLIDE the whole set
         left or right and the variance does not move (translation invariance);
         STRETCH every distance ×2 and the variance goes ×4 (the k² scaling law).

   Deliberately DISTINCT from its statistics siblings:
       • DataLab teaches CENTER (mode / median / mean) on a dot plot and frames
         the mean as the balance point; range is its only spread idea.
       • MeanLab teaches the mean as a fair share of unit-cube towers.
       • StandardDeviationLab is the SEQUEL to this lab: it takes the square root
         of the variance to climb back to the data's own units, draws the ± σ
         band, and headlines σ as "the typical distance from the mean."
     This lab stops AT the variance (it does not draw a ± σ band and does not
     headline σ — only teases "take √ → the Standard-Deviation lab").  Its own
     content — the MAD-vs-variance duel, the squared-units emphasis, the
     identity mean(x²) − mean² , and the scaling / translation laws — is what
     makes it its own window onto spread.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 6-9
   into High-School Statistics: CCSS 6.SP.B.5.c (summarize spread with the mean
   absolute deviation) as the on-ramp, building toward HSS-ID.A.2 (compare the
   spread of two or more data sets) — variance is the squared measure that the
   standard deviation is the square root of.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   lenses that unlock one per lesson step, predict-then-check questions gated on
   ANSWERED not correct, and a calibration challenge with a live match meter and
   a CALIBRATED stamp.

   One-accent discipline: CARMINE is the mathematical object this lab reveals —
   the VARIANCE: the deviation squares, the average square, and the variance
   readout are carmine.  Everything else is a quiet supporting hue so it never
   fights the accent — the MEAN (a prerequisite, not the star) is calm BLUE, the
   raw DEVIATIONS are neutral SLATE, and the MAD comparison is a warm AMBER "the
   other choice."  GREEN is reserved for "correct" and "CALIBRATED."

   Correctness — every statistic is EXACT integer / rational arithmetic, so a
   K-12 student never meets a float artefact like 1.99999996.  With integer data
   and Σx = sum, Σx² = ss over n values, and the key non-negative integer
       Nv = n·Σx² − (Σx)²   ( = n·Σ(xᵢ − μ)² , always ≥ 0 ):
       • deviation      xᵢ − μ = (n·xᵢ − sum) / n           (exact rational)
       • Σ deviations   Σ(n·xᵢ − sum) = 0                   (exact; "they cancel")
       • Σ squared dev  Σ(xᵢ − μ)²    = Nv / n              (exact rational)
       • VARIANCE       = Nv / n²                            (exact rational)
       • MAD            = (Σ|n·xᵢ − sum|) / n²               (exact rational)
       • identity       Σx²/n − (sum/n)² = (n·Σx² − sum²)/n² = Nv/n²  (exact)
     The variance is rendered as an integer, an exact terminating decimal, or a
     clearly-marked "≈" rounding — never a raw float.  Floats are used ONLY for
     pixels and the meter, never to decide a pass: CALIBRATION is an EXACT
     integer hit — variance = V (an integer target) ⟺ Nv = V·n².

   NOTE on ÷n vs ÷(n−1): this lab teaches the POPULATION variance (divide by n),
   because then the variance IS the true average of the squares — the whole
   visual story.  A SAMPLE variance divides the sum of squares by (n−1)
   (Bessel's correction) to estimate a larger population from a sample; that is a
   later, more advanced idea and is flagged in the footer.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/VarianceLab.jsx
     2. Import and render it:
          import VarianceLab from './VarianceLab';
          export default function Page() { return <VarianceLab />; }
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
   by clicking the number line (click empty space to add a dot, click a dot to
   remove it, drag a dot to move it), and each lens (Deviations, Compare MAD,
   Squares, Variance) unlocks one per lesson step and adds one layer to the
   picture — so the image never runs ahead of the idea.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 10; // the number line runs 0…10
const MIN_POINTS = 2; // need at least two values to have any spread
const MAX_POINTS = 7; // keeps the squares strip readable
const MAX_STACK = 6; // how many dots may pile on one value before we stop stacking

// A friendly starting set: mean exactly 5, variance exactly 2, MAD exactly 1 —
// so the very first thing a student sees is clean, and the variance (2) and the
// MAD (1) already differ, previewing the duel.  3,5,5,7.
const START_DATA = [3, 5, 5, 7];

const STEP_SPREAD = 0; // meet spread — same mean, different spread
const STEP_DEV = 1; // deviation = distance from the mean; they sum to zero
const STEP_SIGN = 2; // drop the sign: MAD (a distance) vs squaring (an area)
const STEP_SQUARES = 3; // each deviation becomes a square of area (x−mean)²
const STEP_VAR = 4; // variance = the AVERAGE of those squares (the mean square)
const STEP_IDENT = 5; // the shortcut identity + the slide / stretch laws
const STEP_CALIB = 6; // build a set with the target variance (calibration)

// the lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'dev', unlock: STEP_DEV, color: '#5b6b7b', name: 'Deviations', role: 'distance from the mean' },
  { key: 'mad', unlock: STEP_SIGN, color: '#c8811e', name: 'Compare MAD', role: 'average distance (no square)' },
  { key: 'squares', unlock: STEP_SQUARES, color: '#c81e4f', name: 'Squares', role: 'each deviation, squared' },
  { key: 'variance', unlock: STEP_VAR, color: '#c81e4f', name: 'Variance', role: 'the average square' },
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
  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);
  const intPart = Math.floor(num / den);
  let rem = num % den;
  if (rem === 0) return sign + String(intPart);
  let frac = '';
  let guard = 0;
  while (rem !== 0 && guard < 14) {
    rem *= 10;
    frac += Math.floor(rem / den);
    rem %= den;
    guard++;
  }
  return sign + intPart + '.' + frac;
}
function terminates(den) {
  let d = Math.abs(den);
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
// round num/den to hundredths, formatted exactly (no float artefact)
function roundedHundredths(num, den) {
  const sign = num < 0 ? '-' : '';
  const H = Math.round((Math.abs(num) * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return sign + whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact terminating decimal, or "≈" 2-dp round
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
// integer square root (exact); floor of √n for n ≥ 0
function isqrt(n) {
  if (n < 0) return -1;
  let x = Math.floor(Math.sqrt(n));
  while (x > 0 && x * x > n) x--;
  while ((x + 1) * (x + 1) <= n) x++;
  return x;
}
// format a non-negative float to exactly 2 decimals (for the √ teaser)
function round2Str(x) {
  const H = Math.round(x * 100);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}

/* Everything about a data set, computed EXACTLY.

   Key integers (all derived from the integer data):
     sum = Σx , ss = Σx²
     Nv  = n·ss − sum²                 ( = n·Σ(xᵢ−μ)² , always ≥ 0 )
     Aabs = Σ|n·xᵢ − sum|              ( = n·Σ|xᵢ−μ| , for the MAD )
   Then, as exact rationals:
     mean          = sum / n
     Σ(xᵢ−μ)²      = Nv / n
     VARIANCE      = Nv / n²
     MAD           = Aabs / n²
     mean of x²    = ss / n
     (mean x)²     = sum² / n²
*/
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const ss = data.reduce((a, b) => a + b * b, 0);
  let Aabs = 0;
  for (const v of data) Aabs += Math.abs(n * v - sum);
  const Nv = n * ss - sum * sum; // = n·Σ(x−μ)²  ≥ 0
  return { n, sum, ss, Nv, Aabs };
}

// exact display strings for every headline statistic
function statStrings(n, sum, ss, Nv, Aabs) {
  const mean = fmtRatio(sum, n); // sum / n
  const ssDev = fmtRatio(Nv, n); // Σ(x−μ)²
  const variance = fmtRatio(Nv, n * n); // Nv / n²
  const mad = fmtRatio(Aabs, n * n); // Aabs / n²
  const meanSq = fmtRatio(ss, n); // mean of the squares:  Σx² / n
  const sqMean = fmtRatio(sum * sum, n * n); // square of the mean: (sum/n)²
  // √variance teaser (this lab does NOT headline σ — only teases it):
  const r = isqrt(Nv);
  const sigma =
    r * r === Nv ? fmtRatio(r, n) : { text: round2Str(Math.sqrt(Nv) / n), approx: true };
  return { mean, ssDev, variance, mad, meanSq, sqMean, sigma };
}

// signed exact deviation string for one value:  (n·x − sum) / n
function devString(v, n, sum) {
  const f = fmtRatio(n * v - sum, n);
  return (f.approx ? '≈ ' : '') + f.text;
}
// exact squared-deviation string for one value:  (n·x − sum)² / n²
function devSqString(v, n, sum) {
  const num = (n * v - sum) * (n * v - sum);
  const f = fmtRatio(num, n * n);
  return (f.approx ? '≈ ' : '') + f.text;
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION goal (the skill's sanctioned alternative
   to curve-matching): build ANY data set whose VARIANCE lands exactly on a
   target average-square area T.  Distinct from StandardDeviationLab's target
   (which fixes the standard deviation σ): here the target is the VARIANCE
   itself, framed as "make the average square this big."  Because variance is
   translation-invariant and permutation-invariant, every target has many
   solutions — the point is to feel that spreading the dots out RAISES the
   variance and clustering them LOWERS it, while sliding the whole set does
   nothing.  The meter reads closeness in area units; CALIBRATED is an EXACT
   integer hit:  Nv === T · n².  Each target ships a known solution so "Show one
   answer" can always reveal a legal set.
   ------------------------------------------------------------------------- */
const CAL_SCALE = 6; // area-units spread across the match meter
const matchPercent = (variance, T) => 100 * Math.max(0, 1 - Math.abs(variance - T) / CAL_SCALE);
const isCalibrated = (Nv, n, T) => Nv === T * n * n; // exact: variance === T

// A pool of integer targets, each with a guaranteed legal solution set in 0…10.
// (Verified in audit-variance.mjs: variance(solution) === target exactly.)
const CAL_TARGETS = [
  { T: 2, solution: [3, 4, 5, 6, 7] }, // n=5, Nv=50 = 2·25
  { T: 3, solution: [4, 4, 4, 8] }, // n=4, Nv=48 = 3·16
  { T: 4, solution: [2, 4, 5, 6, 8] }, // n=5, Nv=100 = 4·25
  { T: 5, solution: [2, 4, 6, 8] }, // n=4, Nv=80 = 5·16
  { T: 6, solution: [1, 4, 5, 7, 8] }, // n=5, ss=155, Nv=5·155−625=150 = 6·25
];

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
function makeCalib(prev) {
  // pick a target different from the previous one when possible
  let pick;
  let guard = 0;
  do {
    pick = CAL_TARGETS[randInt(0, CAL_TARGETS.length - 1)];
    guard++;
  } while (guard < 40 && prev && prev.T === pick.T);
  // start the student on a FLAT set (all at the mid value → variance 0) so the
  // challenge always begins under-spread and nothing is pre-solved.
  const startN = pick.solution.length;
  const start = new Array(startN).fill(5);
  return { T: pick.T, solution: pick.solution.slice(), data: start };
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The VARIANCE is the star, in the carmine accent,
   with its squared-units label; the mean rides along as a calm blue chip and
   (once the duel is unlocked) the MAD as an amber chip.  Rendered by a CHILD
   component, so styles are INLINED (styled-jsx only scopes a component's own
   JSX) — this keeps the readout identical in Next.js and any plain preview.
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
function VarianceEquation({ varStr, varApprox, meanStr, meanApprox, madStr, madApprox, showMad, n }) {
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
          {(varApprox ? '≈ ' : '') + varStr}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#5b6b7b',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          variance σ²
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#2f6db0', background: 'rgba(47,109,176,0.12)' }}>
        mean {(meanApprox ? '≈ ' : '') + meanStr}
      </span>
      {showMad && (
        <span style={{ ...CHIP_BASE, color: '#9a6412', background: 'rgba(200,129,30,0.15)' }}>
          MAD {(madApprox ? '≈ ' : '') + madStr}
        </span>
      )}
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the lens unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   misconceptions ("variance is the middle value", "a far point counts the same
   as a near one", "variance changes when you slide the data").  Next is gated on
   ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Same center, different spread',
    body:
      'Two classes can have the SAME average score and still look completely different — one tightly ' +
      'bunched, one wildly scattered. Variance is the number that captures that difference: how SPREAD ' +
      'OUT the values are around their mean. Build a data set on the number line (click empty space to ' +
      'add a dot, click a dot to remove it, drag to move it), or try the Tight and Wide presets — both ' +
      'have mean 5, but very different variance.',
    q: 'What does variance measure?',
    choices: [
      'How spread out the data is around the mean',
      'The center — the average value',
      'The most common value',
    ],
    answer: 0,
    feedback:
      'Variance measures SPREAD, not center. The Tight and Wide presets share a mean of 5, yet their ' +
      'variance is very different — a small variance means the values huddle near the mean, a large ' +
      'variance means they scatter far from it. Center (mean) and spread (variance) answer two different ' +
      'questions about the same data.',
  },
  {
    title: 'Deviations — and why they cancel',
    body:
      'Turn on the Deviations lens. Each value’s DEVIATION is its signed distance from the mean, ' +
      'value − mean: positive to the right of the mean (blue line), negative to the left. These are the ' +
      'raw ingredients of spread. But there is a catch you must get past before you can average them.',
    q: 'Add up EVERY deviation (each value minus the mean). What do you always get?',
    choices: ['Always 0 — the positives and negatives cancel', 'The mean', 'The number of values, n'],
    answer: 0,
    feedback:
      'The deviations always sum to exactly 0 — that is precisely what the mean is: the balance point ' +
      'where the pulls left and right cancel. So we can’t just average the deviations to measure spread; ' +
      'we’d always get 0. First we have to get rid of the minus signs.',
  },
  {
    title: 'Drop the sign: distance or square?',
    body:
      'There are two honest ways to make the deviations stop cancelling. (1) Take the ABSOLUTE VALUE — ' +
      'the plain distance — and average those: that is the MAD (mean absolute deviation). Turn on ' +
      'Compare MAD to see it as an amber length. (2) SQUARE each deviation. Squaring also kills the sign, ' +
      'but it does something the absolute value does not: it makes far-off points count much more.',
    q: 'One point is 1 away from the mean, another is 3 away. Using SQUARES, how many times more does the far point count?',
    choices: ['9 times — because 3² = 9 versus 1² = 1', '3 times — the same as the distance', 'The same — both count once'],
    answer: 0,
    feedback:
      '3² = 9 and 1² = 1, so with squares the far point counts NINE times as much — squaring makes ' +
      'unusual, far-away values dominate the spread. (With plain distance, the MAD, it would count only ' +
      '3 times as much.) Squaring both removes the sign and makes distance count quadratically — that is ' +
      'why it, not the absolute value, leads to the variance.',
  },
  {
    title: 'Each deviation becomes a square',
    body:
      'Turn on the Squares lens. Now every deviation is drawn as a literal SQUARE whose side is that ' +
      'distance from the mean, so its AREA is the deviation squared, (value − mean)². Drag a dot farther ' +
      'from the mean and watch its square grow far faster than the amber distance does: double the ' +
      'distance and the area quadruples. Every square is positive, so nothing cancels any more.',
    q: 'A value has a deviation of −4. What is the area of its square?',
    choices: ['16 — because (−4)² = 16', '−16 — keep the minus sign', '8 — that is −4 doubled'],
    answer: 0,
    feedback:
      '(−4)² = 16 square units. The minus sign disappears when you square, and a deviation of 4 makes a ' +
      '4×4 square of area 16. Big deviations make big squares — that is exactly how variance lets ' +
      'far-off values show up.',
  },
  {
    title: 'Variance = the average square',
    body:
      'Turn on the Variance lens. Add up the areas of all the little squares, then divide by n. That ' +
      'AVERAGE area is the variance — the mean squared deviation, drawn as one bold carmine square. ' +
      'Because we averaged SQUARED distances, the variance is measured in SQUARED units (if the data are ' +
      'in points, the variance is in points²).',
    q: 'Three squared deviations are 4, 0, and 8. What is the variance (n = 3)?',
    choices: ['4 — because (4 + 0 + 8) ÷ 3 = 4', '12 — just add them', '2 — the middle value'],
    answer: 0,
    feedback:
      'Add the squares: 4 + 0 + 8 = 12, then divide by n = 3 to average them: 12 ÷ 3 = 4. That average ' +
      'square area is the variance. Its side length, √variance, would carry the spread back to the ' +
      'data’s own units — that square root is the standard deviation (the sequel lab).',
  },
  {
    title: 'A shortcut, and two laws',
    body:
      'Two more truths, both live on the readout. SHORTCUT: variance = (the mean of the squares) − ' +
      '(the square of the mean) — you don’t even need the deviations. LAWS: variance cares only about ' +
      'DISTANCES from the mean, so SLIDING the whole set left or right (use ◄ / ► Slide) changes ' +
      'nothing; but STRETCHING every distance from the mean by ×2 makes the variance ×4.',
    q: 'If every value moves twice as far from the mean, the variance becomes…',
    choices: ['4 times as big — distances are squared', '2 times as big — same as the distance', 'Unchanged'],
    answer: 0,
    feedback:
      'Twice the distance means 2² = 4 times the squared distance, so the variance is ×4 — the k² ' +
      'scaling law. Sliding the whole data set, on the other hand, leaves every distance-from-the-mean ' +
      'the same, so the variance does not change at all. Variance sees spread, not location.',
  },
  {
    title: 'Challenge: build the target variance',
    body:
      'Final challenge — a construction goal. A target variance is fixed (the grey square). Build ANY ' +
      'data set whose variance lands exactly on it: spread the dots out to raise the average square, ' +
      'pull them toward the mean to shrink it. Sliding the whole set does nothing — only distances from ' +
      'the mean matter. The meter reads CALIBRATED when your average square exactly matches the target.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function VarianceLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [calibInfo, setCalibInfo] = useState(null); // { T, solution, data } during calibration
  const [lensOn, setLensOn] = useState({ dev: false, mad: false, squares: false, variance: false });

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry + dot hit targets, written by draw()
  const sceneRef = useRef({}); // snapshot the renderer reads
  const dataRef = useRef(data); // latest data for pointer handlers
  const grabRef = useRef(null); // { i, wasExisting, moved } while pointer is down
  const calibRef = useRef(null);

  dataRef.current = data;
  calibRef.current = calibInfo;

  const current = STEPS[step];
  const calib = !!current.calib;

  const { n, sum, ss, Nv, Aabs } = computeStats(data);
  const S = statStrings(n, sum, ss, Nv, Aabs);
  const varianceVal = Nv / (n * n); // float — pixels & meter only
  const madVal = Aabs / (n * n);
  const meanVal = sum / n;

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    dev: (lensOn.dev && step >= STEP_DEV) || calib,
    mad: lensOn.mad && step >= STEP_SIGN && !calib,
    squares: (lensOn.squares && step >= STEP_SQUARES) || calib || (lensOn.variance && step >= STEP_VAR),
    variance: (lensOn.variance && step >= STEP_VAR) || calib,
  };

  const target = calib && calibInfo ? calibInfo.T : null;
  const matchPct = target != null ? matchPercent(varianceVal, target) : 0;
  const calibrated = target != null ? isCalibrated(Nv, n, target) : false;

  // slide (translation) headroom — used to enable/disable the Slide buttons
  const minV = data.length ? Math.min(...data) : 0;
  const maxV = data.length ? Math.max(...data) : 0;
  const canSlideLeft = minV > VMIN;
  const canSlideRight = maxV < VMAX;

  sceneRef.current = {
    data,
    n,
    meanVal,
    varianceVal,
    madVal,
    varianceText: (S.variance.approx ? '≈ ' : '') + S.variance.text,
    madText: (S.mad.approx ? '≈ ' : '') + S.mad.text,
    eff,
    calib,
    target,
    targetSolutionN: calib && calibInfo ? calibInfo.solution.length : 0,
    calibrated,
    sum,
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

    /* palette (kept in one place so the drawing matches the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F'; // the VARIANCE — squares, average square, readout
    const CARM_FILL = 'rgba(200,30,79,0.13)';
    const CARM_FILL2 = 'rgba(200,30,79,0.22)';
    const BLUE = '#2F6DB0'; // the MEAN (a quiet prerequisite)
    const AMBER = '#C8811E'; // the MAD comparison ("the other choice")
    const DOT = '#26384a'; // a data point
    const GREY = 'rgba(91,107,123,0.9)'; // the neutral target in the challenge

    const s = sceneRef.current;
    ctx.clearRect(0, 0, Wd, Hd);

    /* faint quadrille backdrop */
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

    /* ---- regions ---------------------------------------------------------- */
    const padL = 42;
    const padR = 22;
    const spanW = Wd - padL - padR;
    const xOf = (v) => padL + (v / VMAX) * spanW;

    // Region 1 (top): number line + dots + mean + deviations
    const lineY = Math.round(Hd * 0.4);
    const R = 7; // dot radius
    const stackStep = 2 * R + 3;

    // Region 2 (bottom): the squares strip
    const r2Top = Math.round(Hd * 0.48);
    const r2Bottom = Hd - 46; // leave room below the baseline for amber MAD marks
    const baseY = r2Bottom; // squares sit on this baseline

    /* ---- number line + ticks ---------------------------------------------- */
    ctx.strokeStyle = 'rgba(28,43,58,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, lineY + 0.5);
    ctx.lineTo(Wd - padR, lineY + 0.5);
    ctx.stroke();
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= VMAX; v++) {
      const X = xOf(v);
      ctx.strokeStyle = 'rgba(28,43,58,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X + 0.5, lineY - 4);
      ctx.lineTo(X + 0.5, lineY + 4);
      ctx.stroke();
      ctx.fillText(String(v), X, lineY + 7);
    }

    /* ---- mean line (blue, vertical) + label ------------------------------- */
    if (s.n > 0) {
      const mxLine = xOf(s.meanVal);
      const mf = fmtRatio(s.sum, s.n);
      const label = 'mean ' + (mf.approx ? '≈' : '') + mf.text;
      ctx.save();
      ctx.strokeStyle = BLUE;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(mxLine, 6);
      ctx.lineTo(mxLine, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(label).width;
      let bx = Math.max(padL, Math.min(Wd - padR - tw, mxLine - tw / 2));
      ctx.fillStyle = BLUE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, bx, 6);
      ctx.restore();
    }

    /* ---- dots (with stacking) + deviation segments ------------------------ */
    // group by value to stack duplicates
    const byVal = new Map();
    for (let i = 0; i < s.data.length; i++) {
      const v = s.data[i];
      if (!byVal.has(v)) byVal.set(v, []);
      byVal.get(v).push(i);
    }
    const hits = []; // { i, cx, cy } for pointer hit-testing
    const mx = xOf(s.meanVal);
    for (const [v, idxs] of byVal) {
      const cx = xOf(v);
      for (let k = 0; k < idxs.length; k++) {
        const i = idxs[k];
        const stackK = Math.min(k, MAX_STACK - 1);
        const cy = lineY - R - 2 - stackK * stackStep;

        // deviation segment from the mean line to this dot (slate)
        if (s.eff.dev && Math.abs(v - s.meanVal) > 1e-9) {
          ctx.save();
          ctx.strokeStyle = 'rgba(91,107,123,0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mx, cy);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.restore();
        }

        // the dot
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = DOT;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        hits.push({ i, cx, cy });
      }
    }

    // deviation value labels (only the topmost dot of each column, to avoid clutter)
    if (s.eff.dev) {
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillStyle = INK_SOFT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const [v, idxs] of byVal) {
        if (Math.abs(v - s.meanVal) < 1e-9) continue;
        const cx = xOf(v);
        const topK = Math.min(idxs.length - 1, MAX_STACK - 1);
        const cy = lineY - R - 2 - topK * stackStep;
        const dnum = s.n * v - s.sum;
        const df = fmtRatio(dnum, s.n);
        ctx.fillText((df.approx ? '≈' : '') + df.text, cx, cy - R - 3);
      }
    }

    /* ---- region 2: deviation SQUARES + amber MAD lengths + the AVERAGE ----- */
    // sides in data-units: |deviation| per point, √variance for the average
    // square, MAD for the amber average length, √target for the challenge ghost.
    const sides = s.data.map((v) => Math.abs(v - s.meanVal));
    const sdSide = Math.sqrt(Math.max(0, s.varianceVal)); // side of the average square
    const madLen = s.madVal; // amber average-distance length (data units)
    const tSide = s.calib && s.target != null ? Math.sqrt(s.target) : 0;

    const r2W = Wd - padL - padR;
    const r2H = r2Bottom - r2Top;
    // Region 2 is split: a LEFT strip for the per-point marks and a fixed RIGHT
    // block for the average — so the caption never collides with the average
    // label whatever the data.  ONE shared pixels-per-unit, so the little
    // squares and the average square are area-comparable.
    const leftX0 = padL + 6;
    const leftX1 = padL + r2W * 0.58;
    const avgX = padL + r2W * 0.66; // average block anchor
    const rightW = Wd - padR - avgX;
    const gapU = 0.4;
    const nItems = s.data.length;
    const sumSides = sides.reduce((a, b) => a + b, 0);
    const maxSide = Math.max(...sides, sdSide, tSide, 1e-6);
    const pxuH = (r2H * 0.6) / maxSide;
    const pxuLeft = (leftX1 - leftX0) / Math.max(sumSides + gapU * nItems + 0.5, 0.001);
    const pxuRight = (rightW * 0.85) / Math.max(sdSide + tSide + 1, 0.001);
    const pxu = Math.min(pxuH, pxuLeft, pxuRight, 30);

    const showStrip = s.eff.squares || s.eff.mad;

    // caption (left region only) — shrink, then drop, if it would run into the
    // average column on a narrow canvas (keeps mobile clean).
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let capFull = null;
    let capShort = null;
    if (s.eff.squares) {
      capFull = 'squared deviations — area = (value − mean)²';
      capShort = 'squared deviations';
    } else if (s.eff.mad) {
      capFull = 'distances from the mean — |value − mean|';
      capShort = 'distances';
    }
    if (capFull) {
      const room = avgX - 16 - leftX0;
      const cap = ctx.measureText(capFull).width <= room ? capFull : capShort;
      if (ctx.measureText(cap).width <= room) ctx.fillText(cap, leftX0, r2Top - 4);
    }

    // ---- per-point strip: carmine squares and/or amber distance segments ----
    if (showStrip) {
      let x = leftX0;
      for (let i = 0; i < nItems; i++) {
        const side = sides[i] * pxu;
        const slot = Math.max(side, 12); // min slot so zero/tiny items still get room
        if (side < 1.5) {
          ctx.fillStyle = INK_SOFT;
          ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('0', x + 6, baseY);
          x += slot + gapU * pxu;
          continue;
        }
        if (s.eff.squares) {
          ctx.fillStyle = CARM_FILL;
          ctx.fillRect(x, baseY - side, side, side);
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + 0.5, baseY - side + 0.5, side - 1, side - 1);
          if (side >= 20) {
            ctx.fillStyle = CARMINE;
            ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(devSqString(s.data[i], s.n, s.sum), x + side / 2, baseY - side / 2);
          }
        }
        if (s.eff.mad) {
          ctx.strokeStyle = AMBER;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, baseY + 10.5);
          ctx.lineTo(x + side, baseY + 10.5);
          ctx.stroke();
        }
        x += slot + gapU * pxu;
      }
    }

    // ---- the AVERAGE block (right region) ----------------------------------
    if (s.eff.variance || s.eff.mad) {
      // dashed divider + "average" label at the top of the right region
      ctx.strokeStyle = 'rgba(28,43,58,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(avgX - 14, r2Top - 2);
      ctx.lineTo(avgX - 14, baseY + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('average', avgX, r2Top - 4);

      const aside = sdSide * pxu;

      // In the challenge, the carmine average square shares its lower-left
      // corner with the grey TARGET ghost, so a correct variance makes the
      // carmine square exactly fill the target.
      if (s.calib && s.target != null) {
        const tside = tSide * pxu;
        ctx.save();
        ctx.strokeStyle = GREY;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(avgX + 0.5, baseY - tside + 0.5, tside - 1, tside - 1);
        ctx.setLineDash([]);
        ctx.fillStyle = GREY;
        ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('target ' + s.target, avgX, baseY - Math.max(tside, aside) - 6);
        ctx.restore();
      }

      // the bold carmine AVERAGE square = the variance
      if (s.eff.variance) {
        if (aside >= 1.5) {
          ctx.fillStyle = CARM_FILL2;
          ctx.fillRect(avgX, baseY - aside, aside, aside);
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 2.4;
          ctx.strokeRect(avgX + 1, baseY - aside + 1, aside - 2, aside - 2);
        } else {
          ctx.fillStyle = INK_SOFT;
          ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText('0', avgX, baseY);
        }
        if (!s.calib) {
          ctx.fillStyle = CARMINE;
          ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText('variance = ' + s.varianceText, avgX, baseY - Math.max(aside, 4) - 6);
        }
      }

      // amber average MAD length, value inline to its right (the duel partner)
      if (s.eff.mad) {
        const alen = Math.max(madLen * pxu, 1);
        ctx.strokeStyle = AMBER;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(avgX, baseY + 10.5);
        ctx.lineTo(avgX + alen, baseY + 10.5);
        ctx.stroke();
        ctx.fillStyle = '#9a6412';
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('MAD = ' + s.madText, avgX + alen + 6, baseY + 11);
      }
    }

    /* store geometry for hit-testing */
    geoRef.current = { padL, padR, spanW, xOf, lineY, r2Top, R, hits };
  }, []);

  useEffect(() => {
    draw();
  }, [data, step, calibInfo, lensOn, draw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  /* auto-enable the lens that unlocks on this step */
  useEffect(() => {
    const l = LENSES.find((x) => x.unlock === step);
    if (l) setLensOn((prev) => (prev[l.key] ? prev : { ...prev, [l.key]: true }));
  }, [step]);

  /* set up the challenge the first time we reach it */
  useEffect(() => {
    if (current.calib && calibInfo == null) {
      const c = makeCalib(null);
      setCalibInfo(c);
      setData(c.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---- interaction: build the data set by clicking the number line -------- */
  const valueAt = (cssX) => {
    const g = geoRef.current;
    if (!g.spanW) return 0;
    const v = Math.round(((cssX - g.padL) / g.spanW) * VMAX);
    return Math.max(VMIN, Math.min(VMAX, v));
  };
  const dotAt = (cssX, cssY) => {
    const g = geoRef.current;
    if (!g.hits) return -1;
    let best = -1;
    let bestD = 16 * 16; // within ~16px
    for (const h of g.hits) {
      const dx = cssX - h.cx;
      const dy = cssY - h.cy;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = h.i;
      }
    }
    return best;
  };

  const setValue = (i, v) => {
    setData((arr) => {
      if (arr[i] === v) return arr;
      const next = arr.slice();
      next[i] = v;
      return next;
    });
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    const i = dotAt(cssX, cssY);
    if (i >= 0) {
      // grabbed an existing dot — start a possible drag (or a click-to-remove)
      grabRef.current = { i, wasExisting: true, moved: false, downX: cssX };
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    // empty space: add a dot here (region 1 only) if we have room
    const inRegion1 = g.r2Top == null || cssY < g.r2Top;
    if (inRegion1 && dataRef.current.length < MAX_POINTS) {
      const v = valueAt(cssX);
      const newIndex = dataRef.current.length;
      setData((arr) => [...arr, v]);
      grabRef.current = { i: newIndex, wasExisting: false, moved: true, downX: cssX };
      if (e.currentTarget.setPointerCapture) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    }
  };
  const onPointerMove = (e) => {
    const grab = grabRef.current;
    if (!grab) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    if (Math.abs(cssX - grab.downX) > 4) grab.moved = true;
    if (grab.moved) setValue(grab.i, valueAt(cssX));
  };
  const onPointerUp = () => {
    const grab = grabRef.current;
    grabRef.current = null;
    if (!grab) return;
    // a click (no drag) on an existing dot removes it, if we stay above MIN
    if (grab.wasExisting && !grab.moved) {
      setData((arr) => (arr.length > MIN_POINTS ? arr.filter((_, k) => k !== grab.i) : arr));
    }
  };

  /* ---- toolbar / presets ------------------------------------------------- */
  const applyPreset = (arr) => {
    setData(arr.slice(0, MAX_POINTS).map((v) => Math.max(VMIN, Math.min(VMAX, v))));
  };
  const randomSet = () => {
    const k = randInt(4, 6);
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(randInt(VMIN, VMAX));
    applyPreset(arr);
  };
  const slide = (dir) => {
    // translation: shift every value by ±1 if there is headroom (variance unchanged)
    setData((arr) => {
      const lo = Math.min(...arr);
      const hi = Math.max(...arr);
      if (dir < 0 && lo <= VMIN) return arr;
      if (dir > 0 && hi >= VMAX) return arr;
      return arr.map((v) => v + dir);
    });
  };

  const toggleLens = (key, unlock) => {
    if (step < unlock || calib) return;
    setLensOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const choose = (idx) => {
    if (answers[step] != null) return;
    setAnswers((prev) => ({ ...prev, [step]: idx }));
  };
  const goNext = () => setStep((sp) => Math.min(STEPS.length - 1, sp + 1));
  const goBack = () => {
    if (calib) {
      setCalibInfo(null);
      setData(START_DATA);
    }
    setStep((sp) => Math.max(0, sp - 1));
  };
  const newTarget = () => {
    const c = makeCalib(calibInfo);
    setCalibInfo(c);
    setData(c.data);
  };
  const showSolution = () => {
    if (calibInfo) setData(calibInfo.solution.slice());
  };

  const answered = answers[step] != null;
  const hasQuestion = !!current.q;
  const canNext = step < STEPS.length - 1 && (!hasQuestion || answered);

  /* spoken description (accessibility) */
  const spoken = calib
    ? `Challenge: build a data set with variance ${target}. Your current data is ${data.join(', ')}, ` +
      `with mean ${(S.mean.approx ? 'about ' : '') + S.mean.text} and variance ` +
      `${(S.variance.approx ? 'about ' : '') + S.variance.text}.` +
      (calibrated ? ' Calibrated — the variance is exactly on the target.' : '')
    : `${n} data values: ${data.join(', ')}. The mean is ${(S.mean.approx ? 'about ' : '') + S.mean.text}. ` +
      `The sum of squared deviations is ${(S.ssDev.approx ? 'about ' : '') + S.ssDev.text}, so the variance — ` +
      `the average squared deviation — is ${(S.variance.approx ? 'about ' : '') + S.variance.text}` +
      ` (in squared units), and the mean absolute deviation is ${(S.mad.approx ? 'about ' : '') + S.mad.text}.`;

  return (
    <div className="vlab">
      <header className="head">
        <h1>Variance — the Average Square</h1>
        <p className="lede">
          <em>Variance</em> measures how <em>spread out</em> data is around its mean. Because the raw{' '}
          <span className="mono">deviations</span> (value − mean) always cancel to zero, we{' '}
          <em>square</em> each one — turning every distance into the <em>area</em> of a square — and then
          take the average. That average area <span className="mono">is</span> the variance, and this lab
          shows why squaring (not just distance) is the move. Each lens unlocks with the lesson, so the
          picture is never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <VarianceEquation
                varStr={S.variance.text}
                varApprox={S.variance.approx}
                meanStr={S.mean.text}
                meanApprox={S.mean.approx}
                madStr={S.mad.text}
                madApprox={S.mad.approx}
                showMad={eff.mad}
                n={n}
              />
            </p>
            <p className="equation-sub mono">
              variance = Σ(x − mean)² ÷ n = <b className="carm">{(S.ssDev.approx ? '≈ ' : '') + S.ssDev.text}</b> ÷ {n}
              {step >= STEP_IDENT ? (
                <>
                  {' '}
                  &nbsp;·&nbsp; = mean(x²) − (mean)² = {(S.meanSq.approx ? '≈ ' : '') + S.meanSq.text} −{' '}
                  {(S.sqMean.approx ? '≈ ' : '') + S.sqMean.text}
                </>
              ) : null}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">
              {calib
                ? 'drag a dot to move · click empty space to add · click a dot to remove'
                : 'click to add a dot · drag to move · click a dot to remove'}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Mean μ</span>
              <span className="fact-v mono blue">{(S.mean.approx ? '≈ ' : '') + S.mean.text}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Σ(x − μ)²</span>
              <span className="fact-v mono">{(S.ssDev.approx ? '≈ ' : '') + S.ssDev.text}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Variance = avg square</span>
              <span className="fact-v mono carm big">{(S.variance.approx ? '≈ ' : '') + S.variance.text}</span>
            </div>
          </div>

          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={() => applyPreset([4, 5, 5, 6])} disabled={calib}>
              Tight
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 5, 5, 9])} disabled={calib}>
              Wide
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([2, 4, 6, 8])} disabled={calib}>
              Even spread
            </button>
            <button type="button" className="btn ghost" onClick={randomSet} disabled={calib}>
              Random
            </button>
            {step >= STEP_IDENT && (
              <>
                <button type="button" className="btn ghost" onClick={() => slide(-1)} disabled={!canSlideLeft}>
                  ◄ Slide
                </button>
                <button type="button" className="btn ghost" onClick={() => slide(1)} disabled={!canSlideRight}>
                  Slide ►
                </button>
              </>
            )}
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

          <div className="lenses" role="group" aria-label="Idea lenses">
            {LENSES.map((l) => {
              const unlocked = step >= l.unlock;
              const on = eff[l.key];
              const disabled = !unlocked || calib;
              return (
                <button
                  type="button"
                  key={l.key}
                  className={'lens' + (on ? ' on' : '') + (!unlocked ? ' locked' : '')}
                  style={on ? { borderColor: l.color, boxShadow: `inset 0 0 0 1px ${l.color}` } : undefined}
                  onClick={() => toggleLens(l.key, l.unlock)}
                  disabled={disabled}
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

          {current.calib && calibInfo && (
            <div className="calib">
              <p className="calib-hint mono">
                target variance = {target} &nbsp;·&nbsp; your variance ={' '}
                <b className="carm">{(S.variance.approx ? '≈ ' : '') + S.variance.text}</b>
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">
                    {varianceVal < target ? 'too tight — spread the dots out' : 'too spread — pull dots toward the mean'}
                  </span>
                )}
              </div>
              <div className="calib-btns">
                <button type="button" className="btn ghost" onClick={showSolution}>
                  Show one answer
                </button>
                <button type="button" className="btn ghost" onClick={newTarget}>
                  New target
                </button>
              </div>
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
                  setCalibInfo(null);
                  setLensOn({ dev: false, mad: false, squares: false, variance: false });
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
        <span className="mono">variance = Σ(x − mean)² ÷ n = mean(x²) − (mean)²</span> &nbsp;·&nbsp; the average
        squared deviation, in squared units (population variance, ÷ n). Take its square root to get the{' '}
        <em>standard deviation</em>, back in the data’s own units. A <em>sample</em> variance divides by{' '}
        (n − 1) instead — a later idea. CCSS 6.SP.B.5c → HSS-ID.A.2.
      </footer>

      <style jsx>{`
        .vlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #2f6db0;
          --amber: #c8811e;
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
          max-width: 74ch;
        }
        .lede em {
          font-style: italic;
          color: var(--ink);
        }
        .bench {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }
        @media (max-width: 940px) {
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
          aspect-ratio: 8 / 5.4;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: crosshair;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
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
          bottom: 8px;
          font-size: 10.5px;
          color: var(--ink-soft);
          background: rgba(251, 251, 248, 0.85);
          padding: 3px 7px;
          border-radius: 5px;
          pointer-events: none;
        }
        .facts {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
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
          letter-spacing: 0.05em;
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
          font-weight: 700;
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
        .calib-hint {
          margin: 0;
          font-size: 12px;
          color: var(--ink-soft);
          background: rgba(28, 43, 58, 0.04);
          padding: 8px 10px;
          border-radius: 6px;
          line-height: 1.5;
        }
        .calib-hint .carm {
          color: var(--curve);
        }
        .calib-btns {
          display: flex;
          gap: 8px;
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
          gap: 8px;
          font-size: 13px;
        }
        .target-hint {
          color: var(--ink-soft);
          font-size: 12px;
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
        .foot em {
          color: var(--ink);
          font-style: italic;
        }
        :global(.vlab) :focus-visible {
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
