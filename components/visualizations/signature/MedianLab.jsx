'use client';

/* ============================================================================
   MedianLab — an interactive "bench" for the MEDIAN: the middle value of a data
   set.  Unlike the mean (a balance of DISTANCES) the median is a balance of
   COUNTS — it is a POSITIONAL center.  The lab is built around three ideas that
   belong to the median and to nothing else:

     1. ORDER, then walk to the middle.  Line the values up smallest → largest
        and cross out the smallest and the largest together, again and again.
        Whatever is left standing in the middle IS the median.  With an ODD count
        one value survives (a real data value); with an EVEN count two survive and
        the median is halfway between them — it need not be a value in the set.
     2. HALF below, HALF above.  The median splits the ordered data into two equal
        COUNTS: as many values below it as above it.  That is its defining job.
     3. It RESISTS outliers.  Because the median only cares about POSITION in the
        order, one runaway value barely moves it — while the mean, a balance of
        distances, chases the outlier.  This is why medians are reported for home
        prices, incomes, and test scores.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 6–7
   (CCSS 6.SP.A.2 "a set of data has a distribution described by its center,
   spread, and shape"; 6.SP.B.5.c "summarize with measures of center"; extends
   the dot-plot work of 5.MD / 6.SP.B.4).  It is a DISTINCT companion to the Data
   lab: Data meets all three centers and makes the MEAN its star (the balance
   point); this lab makes the MEDIAN its star and teaches the sort-to-the-middle
   procedure, the even/odd rule, the 50/50 split, and outlier resistance — the
   parts of "the middle" a single dashed line cannot show.

   House style: the interactive-math-bench standard — quadrille-paper canvas,
   controls that unlock one per lesson step, predict-then-check questions, and a
   calibration challenge with a live match meter and a CALIBRATED stamp.  Two
   linked pictures of one data set (the Data/Decimal "one thing, two models"
   signature, retuned for the median):
     • the DOT PLOT (top) — value on a number line, one stacked dot per data
       point.  This carries the MEDIAN line, and the soft two-color SPLIT that
       shows the halves.
     • the SORTED ROW (bottom, revealed once we put the data in order) — the
       values laid out left → right in increasing order as tiles, with a carmine
       PINCER that crosses out from both ends until only the middle is left.  This
       is where the procedure, the even/odd survivors, and the 50/50 braces live.

   One-accent discipline: CARMINE is the mathematical object the lab reveals — the
   MEDIAN (the median line, the pincer, the survivor tiles, the median readout).
   Everything else is clearly SECONDARY and keeps a quiet hue so it never fights
   the accent: the lower half is blue, the upper half is amber, and the MEAN — the
   foil in the outlier lesson — is a muted slate dashed line.  Green is reserved
   for "correct" and "CALIBRATED".

   All statistics are EXACT integer arithmetic, so a K-12 student never meets a
   float artefact like 4.5000001:
     • data values are integers 0…10.
     • the median is kept as an exact ratio {num, den} with den ∈ {1, 2}: an odd
       count gives a whole middle value (den 1); an even count gives the sum of
       the two middles over 2 (den 2) — rendered as an integer or a clean ".5".
     • the mean (shown only as the outlier foil) is the reduced fraction sum/n,
       printed as an integer, an exact terminating decimal, or a marked "≈" 2-dp.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/MedianLab.jsx
     2. Import and render it:
          import MedianLab from './MedianLab';
          export default function Page() { return <MedianLab />; }
   Zero dependencies. Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app. JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth (the data array, which
              lenses are on, the pincer position, the lesson step).
     MODEL  — the statistics are exact integer arithmetic; they know no pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters. The "dials" here are LENSES, not sliders: the data is
   built by clicking the number line, and each lens (Order, Median, Split,
   Compare mean) unlocks one per lesson step and overlays that idea — so the
   picture is never ahead of the idea.  The value axis is small and integer so
   the dot plot stays legible and every median is classroom-clean.
   ------------------------------------------------------------------------- */
const VMIN = 0;
const VMAX = 10; // number line runs 0…10
const MAX_POINTS = 11; // total dots (keeps the sorted row of tiles readable)
const MAX_STACK = 8; // dots in one column

// a friendly starting set: odd count, distinct values, a clear middle (median 5)
const START_DATA = [2, 4, 5, 7, 8];

const STEP_DATA = 0; // meet data — build a dot plot
const STEP_ORDER = 1; // put the data in order (the sorted row appears)
const STEP_PINCER = 2; // cross out from both ends — walk to the middle
const STEP_MIDDLE = 3; // the median value: odd vs even ((a+b)/2)
const STEP_SPLIT = 4; // half below, half above (the 50/50 split)
const STEP_OUTLIER = 5; // the outlier test — median resists, mean chases
const STEP_CALIB = 6; // build a set with a target median (calibration)

// the lenses, unlocked as the lesson earns them.  CARMINE is the median (the
// star); the others keep quiet, secondary hues.
const LENSES = [
  { key: 'order', unlock: STEP_ORDER, color: '#5b6b7b', name: 'Sorted row', role: 'line them up + the pincer' },
  { key: 'middle', unlock: STEP_MIDDLE, color: '#c81e4f', name: 'Median', role: 'the middle value' },
  { key: 'split', unlock: STEP_SPLIT, color: '#3f74a6', name: 'Split 50/50', role: 'half below, half above' },
  { key: 'mean', unlock: STEP_OUTLIER, color: '#5b6b7b', name: 'Compare mean', role: 'the outlier foil' },
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
// exact terminating decimal for num/den by integer long division
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
function roundedHundredths(num, den) {
  const H = Math.round((num * 100) / den);
  const whole = Math.floor(H / 100);
  const frac = H % 100;
  return whole + '.' + String(frac).padStart(2, '0');
}
// format an exact ratio: integer, exact decimal, or "≈" 2-dp rounding (for the mean)
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false };
  return { text: roundedHundredths(r.num, r.den), approx: true };
}
// the median as text from its exact ratio (den is only ever 1 or 2)
function fmtMedian(medNum, medDen) {
  if (medDen === 1) return String(medNum);
  const whole = Math.floor(medNum / 2);
  return medNum % 2 ? whole + '.5' : String(whole); // 9/2 → "4.5", 10/2 → "5"
}

// Everything the median needs, EXACT.  medNum/medDen is the median as a reduced
// ratio; the "middle" indices are the sorted positions the pincer converges on.
function computeStats(data) {
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const sorted = [...data].sort((a, b) => a - b);
  const minV = n ? sorted[0] : 0;
  const maxV = n ? sorted[n - 1] : 0;

  let medNum = 0;
  let medDen = 1;
  let midIdx = []; // sorted index/indices of the middle
  if (n) {
    if (n % 2) {
      const m = (n - 1) / 2;
      medNum = sorted[m];
      medDen = 1;
      midIdx = [m];
    } else {
      const a = n / 2 - 1;
      medNum = sorted[a] + sorted[a + 1];
      medDen = 2;
      midIdx = [a, a + 1];
    }
  }
  // the 50/50 split, BY POSITION (the honest statement, immune to value ties):
  // exactly ⌊n/2⌋ values sit below the middle and ⌊n/2⌋ above it.
  const half = Math.floor(n / 2);
  const maxPeel = n > 0 ? Math.floor((n - 1) / 2) : 0; // pincer steps to reach the middle

  return { n, sum, sorted, minV, maxV, medNum, medDen, midIdx, half, maxPeel };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration. A CONSTRUCTION GOAL (the skill's sanctioned alternative
   to curve-matching): a target median is marked on the number line; the student
   builds ANY data set (at least 3 points) whose median lands exactly on it.
   There are many winning sets — that is the point: the median pins the MIDDLE,
   not the whole set.  The meter reads closeness in value units; CALIBRATED is an
   EXACT hit, checked in integers: medNum === target · medDen.
   ------------------------------------------------------------------------- */
const MATCH_SCALE = 3; // value-units spread across the meter
const matchPercent = (medVal, exists, T) =>
  exists ? 100 * Math.max(0, 1 - Math.abs(medVal - T) / MATCH_SCALE) : 0;
const isCalibrated = (medNum, medDen, n, T) => n >= 3 && medNum === T * medDen;

function makeTarget(prev) {
  let t;
  do {
    t = 3 + Math.floor(Math.random() * 5); // integer median target 3…7
  } while (prev != null && t === prev);
  return t;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display. The MEDIAN is the star, in the carmine accent; the
   split counts and the mean ride along as small chips as their lenses unlock.
   Rendered by a CHILD component, so styles are INLINED (styled-jsx only scopes a
   component's own JSX) — identical in Next.js and any plain preview.
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
function MedianEquation({ medStr, exists, n, showSplit, half, oddMiddle, showMean, meanStr, meanApprox }) {
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
          {exists ? medStr : '—'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#5b6b7b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          median
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
      {showSplit && exists && (
        <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.12)' }}>
          {half} below · {half} above{oddMiddle ? ' · 1 middle' : ''}
        </span>
      )}
      {showMean && exists && (
        <span style={{ ...CHIP_BASE, color: '#5b6b7b', background: 'rgba(91,107,123,0.14)' }}>
          mean {meanApprox ? '≈ ' : ''}
          {meanStr}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson. One idea per step; the lens unlocks with the step; the reveal
   lives in `feedback` (shown after answering); distractors are real median
   misconceptions ("the median is the middle of the number line," "for an even
   count take the bigger middle," "an outlier drags the median"). Next is gated on
   ANSWERED, not on correct.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Meet the data — build a dot plot',
    body:
      'A data set is a collection of numbers. Click the number line to drop a dot for each value; ' +
      'click a dot to remove it, or drag it to a new value. Dots stack where a value repeats. ' +
      'We are hunting for the MIDDLE of this data — but "middle" only makes sense once the values ' +
      'are lined up in order, so first we build the picture.',
    q: 'To find the middle value of a list, what must you do FIRST?',
    choices: [
      'Put the values in order, smallest to largest',
      'Add the values up and divide by how many',
      'Find the value that appears the most',
    ],
    answer: 0,
    feedback:
      'The median is a POSITION idea: it is the middle of the ordered list. So the first move is ' +
      'always to sort — smallest to largest. (Adding and dividing gives the mean; the most-frequent ' +
      'value is the mode — different centers, different jobs.)',
  },
  {
    title: 'Put them in order',
    body:
      'Now sort the data. The row below the number line lays every value out left → right from ' +
      'smallest to largest — one tile per data point. Order is everything for the median: the same ' +
      'numbers in a jumble hide their middle, but lined up, the middle is a place you can point to.',
    q: 'Why does the median need the data in ORDER, but the mean does not?',
    choices: [
      'The median is defined by POSITION — the middle of the sorted list',
      'Sorting changes the total, which the median uses',
      'It does not — order never matters for the median',
    ],
    answer: 0,
    feedback:
      'The median is whatever value sits in the middle POSITION once the data is sorted, so ordering ' +
      'is the whole game. The mean only needs the total and the count, which do not depend on order — ' +
      'that is a real difference between the two centers.',
  },
  {
    title: 'Cross out from both ends',
    body:
      'Here is the median’s procedure. In the sorted row, cross out the SMALLEST and the LARGEST at ' +
      'the same time — one pair gone. Repeat: next-smallest and next-largest. Keep pinching inward. ' +
      'Use “Step in” to remove a pair, “Step out” to undo, or “To the middle” to finish. Whatever is ' +
      'left standing in the center is the median.',
    q: 'You keep crossing out the smallest and largest of a set with an ODD number of values. What is left at the end?',
    choices: [
      'Exactly one value — the single middle one',
      'Two values, always',
      'Nothing — they all get crossed out',
    ],
    answer: 0,
    feedback:
      'With an odd count the pincer closes on a single survivor — one real value from the set, the ' +
      'median. With an EVEN count two values survive side by side, and we are not done yet: the next ' +
      'step turns those two into one number.',
  },
  {
    title: 'The median value — odd vs even',
    body:
      'Read the survivor. With an ODD count the median is that one middle value — a real member of ' +
      'the set. With an EVEN count TWO values survive; the median is exactly halfway between them: ' +
      'add the two middles and divide by 2. So an even set’s median can be a “.5” that never appears ' +
      'in the data at all. The carmine line marks it on the number line.',
    q: 'What is the median of  3, 6, 8, 9  (an even count)?',
    choices: [
      '7 — halfway between the two middle values 6 and 8',
      '8 — take the larger of the two middle values',
      '6.5 — halfway across the number line from 3 to 9',
    ],
    answer: 0,
    feedback:
      'The two middle values are 6 and 8, so the median is (6 + 8) ÷ 2 = 7 — even though 7 is not in ' +
      'the set. It is the middle of the DATA, not the middle of the number line (that would use only ' +
      'the ends 3 and 9), and you never just keep the bigger middle.',
  },
  {
    title: 'Half below, half above',
    body:
      'This is the median’s definition, and its whole reason to exist: it splits the ordered data ' +
      'into two equal COUNTS — just as many values below the line as above it. Watch the braces under ' +
      'the row: the same number on each side. The median balances the data by COUNT, where the mean ' +
      'balances it by DISTANCE — a key difference you will feel in the next step.',
    q: 'In a set of 9 values, how many sit below the median, and how many above?',
    choices: [
      '4 below and 4 above, with 1 value on the median itself',
      '4 below and 5 above',
      'It depends on how big the numbers are',
    ],
    answer: 0,
    feedback:
      'With 9 values the middle one is the median; that leaves 4 on each side — 4 below, 4 above. ' +
      'The split is by COUNT and by POSITION, so the actual sizes of the numbers never change it. ' +
      'That evenness of counts is exactly what the median guarantees.',
  },
  {
    title: 'The outlier test',
    body:
      'Now the payoff. Turn on the mean (the slate line) to compare. Drag one dot far to the right to ' +
      'make an OUTLIER. Watch: the slate MEAN slides toward it — a balance of distances chases the ' +
      'extreme — while the carmine MEDIAN barely moves, because it only counts POSITIONS. Try it; ' +
      'the gap between the two lines opens up.',
    q: 'You push one value far out to the edge. Which center moves the MOST?',
    choices: [
      'The mean — distance drags a balance point toward the outlier',
      'The median — the middle jumps out to the outlier',
      'They move together by the same amount',
    ],
    answer: 0,
    feedback:
      'The mean is pulled toward an outlier because it balances DISTANCES, and an outlier is far away. ' +
      'The median only cares about ORDER, so one extreme value nudges it at most one position. That ' +
      'resistance is why medians are used for home prices, incomes, and test scores.',
  },
  {
    title: 'Build a set with this median',
    body:
      'Final challenge. A grey target median is fixed on the number line. Build a data set — at ' +
      'least 3 dots — whose carmine median lands exactly on it. There are MANY winning sets: any ' +
      'arrangement with the right value in the middle. The meter reads CALIBRATED when your median ' +
      'hits the target. Press “New target” for a fresh one.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function MedianLab() {
  const [data, setData] = useState(START_DATA);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // target median during calibration
  const [peel, setPeel] = useState(0); // pincer: pairs crossed out from each end
  const [lensOn, setLensOn] = useState({ order: false, middle: false, split: false, mean: false });

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // dot-plot geometry, written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const dataRef = useRef(data); // latest data for pointer handlers
  const grabRef = useRef(null); // { i, startVal, moved } while dragging a dot
  const hoverColRef = useRef(null); // hovered add-column (integer value) or null

  dataRef.current = data;

  const current = STEPS[step];
  const calib = !!current.calib;

  const st = computeStats(data);
  const { n, sum, sorted, minV, maxV, medNum, medDen, midIdx, half, maxPeel } = st;
  const exists = n > 0;
  const medianVal = n > 0 ? medNum / medDen : 0;
  const meanVal = n > 0 ? sum / n : 0;
  const oddMiddle = n % 2 === 1;

  const medStr = n > 0 ? fmtMedian(medNum, medDen) : '—';
  const meanFmt = n > 0 ? fmtRatio(sum, n) : { text: '—', approx: false };

  // clamp the pincer to the current data's valid range
  const peelClamped = Math.max(0, Math.min(peel, maxPeel));

  // effective (drawn) lenses — a lens only shows once its step is reached
  const eff = {
    order: lensOn.order && step >= STEP_ORDER,
    middle: lensOn.middle && step >= STEP_MIDDLE,
    split: lensOn.split && step >= STEP_SPLIT,
    mean: lensOn.mean && step >= STEP_OUTLIER,
  };
  const showStrip = eff.order; // the sorted row + pincer appear with the order lens

  const targetMed = calib && target != null ? target : null;
  const matchPct = targetMed != null ? matchPercent(medianVal, exists, targetMed) : 0;
  const calibrated = targetMed != null ? isCalibrated(medNum, medDen, n, targetMed) : false;

  // Snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer handlers never read stale values.
  sceneRef.current = {
    data,
    n,
    sorted,
    minV,
    maxV,
    medianVal,
    meanVal,
    medNum,
    medDen,
    midIdx,
    half,
    oddMiddle,
    maxPeel,
    peel: peelClamped,
    eff,
    showStrip,
    calib,
    targetMed,
    calibrated,
    medStr,
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
    const CARMINE = '#C81E4F'; // THE MEDIAN — line, pincer, survivor tiles, readout
    const BLUE = '#3F74A6'; // the LOWER half
    const AMBER = '#C0871F'; // the UPPER half
    const SLATE = '#5B6B7B'; // the MEAN (the outlier foil)
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

    const plotTop = 34;
    const baseY = S.showStrip ? Math.round(Hd * 0.6) : Math.round(Hd * 0.62);
    const cellW = spanW / (VMAX - VMIN);

    /* caption above the dot plot */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dot plot — each dot is one data point', padL, 8);

    /* ---- SPLIT lens: soft two-color halves behind the plot ----------------- */
    if (S.eff.split && S.n > 0) {
      const Xm = xOf(S.medianVal);
      ctx.fillStyle = 'rgba(63,116,166,0.08)'; // lower half — blue
      ctx.fillRect(padL, plotTop, Xm - padL, baseY - plotTop);
      ctx.fillStyle = 'rgba(192,135,31,0.08)'; // upper half — amber
      ctx.fillRect(Xm, plotTop, Wd - padR - Xm, baseY - plotTop);
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
    const step0 = availStackH / MAX_STACK; // vertical spacing per stacked dot
    let dotR = Math.min(cellW * 0.36, step0 * 0.46, 12);
    dotR = Math.max(5, dotR);

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
      ctx.fillStyle = 'rgba(63,116,166,0.12)';
      ctx.fillRect(X - cellW / 2, plotTop, cellW, baseY - plotTop);
    }

    /* ---- MEAN foil: dashed slate line (outlier lesson) --------------------- */
    if (S.eff.mean && S.n > 0) {
      const X = xOf(S.meanVal);
      ctx.save();
      ctx.strokeStyle = SLATE;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = SLATE;
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('mean', X, plotTop + 2);
      ctx.restore();
    }

    /* ---- the dots --------------------------------------------------------- */
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = DOT;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(251,251,248,0.9)';
      ctx.stroke();
    }

    /* ---- MEDIAN lens: carmine line + diamond marker + pill ----------------- */
    if (S.eff.middle && S.n > 0) {
      const X = xOf(S.medianVal);
      ctx.save();
      ctx.strokeStyle = CARMINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY);
      ctx.stroke();

      // diamond marker sitting on the axis
      ctx.fillStyle = CARMINE;
      ctx.beginPath();
      ctx.moveTo(X, baseY - 7);
      ctx.lineTo(X + 6, baseY);
      ctx.lineTo(X, baseY + 7);
      ctx.lineTo(X - 6, baseY);
      ctx.closePath();
      ctx.fill();

      // median pill above the plot
      const pill = 'median = ' + S.medStr;
      ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
      const tw = ctx.measureText(pill).width;
      const bw = tw + 16;
      const bh = 20;
      const halfw = bw / 2 + 4;
      const px = Math.min(Math.max(X, padL + halfw), Wd - padR - halfw);
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

    /* ---- calibration target median (grey, fixed) -------------------------- */
    if (S.calib && S.targetMed != null) {
      const X = xOf(S.targetMed);
      ctx.save();
      ctx.strokeStyle = 'rgba(91,107,123,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X, plotTop + 4);
      ctx.lineTo(X, baseY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,107,123,0.95)';
      ctx.beginPath();
      ctx.moveTo(X, baseY + 12);
      ctx.lineTo(X - 7, baseY + 24);
      ctx.lineTo(X + 7, baseY + 24);
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('target ' + S.targetMed, X, plotTop + 2);
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

    /* ================= SORTED ROW + PINCER (bottom) ====================== */
    if (S.showStrip && S.n > 0) {
      const capY = baseY + 30;
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('sorted — cross out the smallest & largest, keep going to the middle', padL, capY);

      const stripPadL = padL;
      const stripSpanW = Wd - padL - padR;
      const slotW = stripSpanW / S.n;
      const tileW = Math.min(slotW * 0.84, 48);
      const tileH = Math.min(tileW, 44);
      const rr = 7;
      // top-anchored: the tile row sits just under the caption (jaw room above),
      // and the survivor / split braces are pinned right below the row — so the
      // sorted picture stays compact instead of floating in an empty band.
      const rowCy = capY + 30 + tileH / 2;
      const underY = rowCy + tileH / 2 + 9;

      const k = S.peel;
      const loEnd = k; // current smallest surviving index
      const hiEnd = S.n - 1 - k; // current largest surviving index
      const done = k >= S.maxPeel; // pincer finished
      const midSet = new Set(S.midIdx);

      const tileX = (i) => stripPadL + slotW * (i + 0.5);

      for (let i = 0; i < S.n; i++) {
        const cx = tileX(i);
        const removed = i < loEnd || i > hiEnd;
        const survivor = done && midSet.has(i);
        const x0 = cx - tileW / 2;
        const y0 = rowCy - tileH / 2;

        // tile body
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

        // value text
        ctx.font = '700 15px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = survivor ? '#fff' : removed ? 'rgba(28,43,58,0.4)' : INK;
        ctx.fillText(String(S.sorted[i]), cx, rowCy + 0.5);

        // strike-through for removed tiles
        if (removed) {
          ctx.strokeStyle = 'rgba(200,30,79,0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0 + 4, rowCy);
          ctx.lineTo(x0 + tileW - 4, rowCy);
          ctx.stroke();
        }
      }

      // the carmine PINCER jaws pointing inward at the current ends
      const jawY = rowCy - tileH / 2 - 12;
      const drawJaw = (i, dir) => {
        const cx = tileX(i) - dir * (tileW / 2 + 7);
        ctx.fillStyle = CARMINE;
        ctx.beginPath();
        ctx.moveTo(cx, jawY - 6);
        ctx.lineTo(cx + dir * 9, jawY);
        ctx.lineTo(cx, jawY + 6);
        ctx.closePath();
        ctx.fill();
      };
      if (S.n > 1) {
        drawJaw(loEnd, 1); // left jaw points right
        drawJaw(hiEnd, -1); // right jaw points left
      }

      // survivor callout when the pincer has finished
      if (done) {
        const cxs = S.midIdx.map(tileX);
        const cx = cxs.reduce((a, b) => a + b, 0) / cxs.length;
        ctx.fillStyle = CARMINE;
        ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (S.midIdx.length === 2) {
          // brace linking the two survivors + the (a+b)/2 note
          const a = S.sorted[S.midIdx[0]];
          const b = S.sorted[S.midIdx[1]];
          ctx.strokeStyle = CARMINE;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cxs[0], underY);
          ctx.lineTo(cxs[0], underY + 5);
          ctx.lineTo(cxs[1], underY + 5);
          ctx.lineTo(cxs[1], underY);
          ctx.stroke();
          ctx.fillText('(' + a + ' + ' + b + ') ÷ 2 = ' + S.medStr, cx, underY + 8);
        } else {
          ctx.fillText('median = ' + S.medStr, cx, underY + 2);
        }
      }

      /* ---- SPLIT lens: braces under the halves --------------------------- */
      if (S.eff.split && S.half > 0) {
        const braceY = underY + (done ? 22 : 2);
        const drawBrace = (i0, i1, color, label) => {
          const x0 = tileX(i0) - tileW / 2;
          const x1 = tileX(i1) + tileW / 2;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x0, braceY);
          ctx.lineTo(x0, braceY + 5);
          ctx.lineTo(x1, braceY + 5);
          ctx.lineTo(x1, braceY);
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(label, (x0 + x1) / 2, braceY + 7);
        };
        drawBrace(0, S.half - 1, BLUE, S.half + ' below');
        drawBrace(S.n - S.half, S.n - 1, AMBER, S.half + ' above');
      }
    }

    /* store dot-plot geometry for hit-testing */
    geoRef.current = { padL, spanW, baseY, plotTop, cellW, dotR, dots };
  }, []);

  /* redraw whenever the state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [data, step, target, lensOn, peel, draw]);

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

  /* editing the data reshuffles the order — reset the pincer so it never points
     at a stale position. */
  useEffect(() => {
    setPeel(0);
  }, [data]);

  /* set up the calibration target the first time we reach it; start empty so the
     build is clearly un-matched. */
  useEffect(() => {
    if (current.calib && target == null) {
      setTarget(makeTarget(null));
      setData([]);
      setLensOn((prev) => ({ ...prev, order: true, middle: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
    // add a dot only within the dot-plot band (the sorted row below is display-only).
    // A functional updater always sees the latest array, so rapid clicks accumulate.
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
        if (countOf(arr, v) >= MAX_STACK && v !== grab.startVal) return; // column full
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
        setData(arr.filter((_, k) => k !== grab.i)); // click on a dot = remove
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
    setData(arr.slice(0, MAX_POINTS));
  };
  const randomSet = () => {
    const k = 5 + Math.floor(Math.random() * 5); // 5…9 points
    const arr = [];
    for (let i = 0; i < k; i++) arr.push(VMIN + Math.floor(Math.random() * (VMAX - VMIN + 1)));
    applyPreset(arr);
  };
  const clearData = () => applyPreset([]);
  const resetData = () => (calib ? setData([]) : setData(START_DATA));

  const stepIn = () => setPeel((p) => Math.min(maxPeel, p + 1));
  const stepOut = () => setPeel((p) => Math.max(0, p - 1));
  const toMiddle = () => setPeel(maxPeel);

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

  /* the sorted-list readout with the middle value(s) bracketed */
  const listParts =
    n > 0
      ? oddMiddle
        ? { pre: sorted.slice(0, midIdx[0]), mid: [sorted[midIdx[0]]], post: sorted.slice(midIdx[0] + 1) }
        : { pre: sorted.slice(0, midIdx[0]), mid: [sorted[midIdx[0]], sorted[midIdx[1]]], post: sorted.slice(midIdx[1] + 1) }
      : null;

  /* spoken description (accessibility) */
  const spoken =
    n === 0
      ? 'The data set is empty. Click the number line to add points.'
      : `A data set of ${n} value${n === 1 ? '' : 's'}. ` +
        `Sorted: ${sorted.join(', ')}. ` +
        `The median is ${medStr}. ` +
        (eff.split ? `${half} value${half === 1 ? '' : 's'} lie below it and ${half} above. ` : '') +
        (eff.mean ? `For comparison the mean is ${meanFmt.approx ? 'about ' : ''}${meanFmt.text}. ` : '');

  return (
    <div className="mlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Median — Find the Middle</h1>
        <p className="lede">
          The <em>median</em> is the <em>middle</em> value of a data set. Build a{' '}
          <span className="mono">dot plot</span>, put the values in order, then cross out from both ends until
          only the middle is left. See why the median splits the data <em>half below, half above</em> — and why,
          unlike the mean, it barely flinches at an <em>outlier</em>. Each lens unlocks with the lesson, so the
          picture is never ahead of the idea.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <MedianEquation
                medStr={medStr}
                exists={exists}
                n={n}
                showSplit={eff.split}
                half={half}
                oddMiddle={oddMiddle}
                showMean={eff.mean}
                meanStr={meanFmt.text}
                meanApprox={meanFmt.approx}
              />
            </p>
            <p className="equation-sub mono">
              {exists && listParts ? (
                <>
                  sorted:&nbsp;
                  {listParts.pre.map((v, i) => (
                    <span key={'p' + i}>{v} </span>
                  ))}
                  <b className="carm">[{listParts.mid.join(' ')}]</b>
                  {listParts.post.map((v, i) => (
                    <span key={'q' + i}> {v}</span>
                  ))}
                  {!oddMiddle ? <> &nbsp;→&nbsp; ({listParts.mid[0]}+{listParts.mid[1]})÷2</> : null}
                </>
              ) : (
                'add points to find the middle'
              )}
            </p>
          </div>

          <div
            className={'stage' + (showStrip ? ' has-strip' : '')}
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
            {calib && calibrated ? ` Calibrated — your median lands on the target of ${targetMed}.` : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Median</span>
              <span className="fact-v mono carm big">{exists ? medStr : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k"># Below</span>
              <span className="fact-v mono blue">{exists ? half : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k"># Above</span>
              <span className="fact-v mono amber">{exists ? half : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Mean</span>
              <span className="fact-v mono slate">{exists ? (meanFmt.approx ? '≈ ' : '') + meanFmt.text : '—'}</span>
            </div>
          </div>

          <div className="toolbar">
            {showStrip && (
              <div className="pincer-group" role="group" aria-label="Pincer controls">
                <button type="button" className="btn ghost" onClick={stepOut} disabled={peelClamped === 0 || n === 0}>
                  ◄ Step out
                </button>
                <span className="peel mono" aria-live="polite">
                  {n === 0 ? '—' : peelClamped + ' / ' + maxPeel}
                </span>
                <button type="button" className="btn ghost" onClick={stepIn} disabled={peelClamped >= maxPeel || n === 0}>
                  Step in ►
                </button>
                <button type="button" className="btn ghost" onClick={toMiddle} disabled={peelClamped >= maxPeel || n === 0}>
                  To the middle
                </button>
              </div>
            )}
          </div>
          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={() => applyPreset([2, 4, 5, 7, 8])}>
              Odd (n=5)
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 3, 4, 7, 8, 9])}>
              Even (n=6)
            </button>
            <button type="button" className="btn ghost" onClick={() => applyPreset([1, 2, 2, 3, 3, 10])}>
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

          <div className="lenses" role="group" aria-label="Median lenses">
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
                  <span className="mono target-hint">{n < 3 ? 'need ≥ 3 dots' : 'aim the median at ' + targetMed}</span>
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
                  setLensOn({ order: false, middle: false, split: false, mean: false });
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
          median = middle of the ordered data &nbsp;·&nbsp; even count → (two middles) ÷ 2 &nbsp;·&nbsp; half below, half
          above
        </span>{' '}
        &nbsp;·&nbsp; the median is a balance of COUNTS, so it resists outliers (CCSS 6.SP). Data here are whole numbers
        0–10; the same ideas scale to any values.
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --blue: #3f74a6;
          --amber: #b07a17;
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
        /* the sorted row appears with the order lens — reflow to a shorter, fuller
           box so the dot plot and the sorted row sit close together, not split by
           an empty band */
        .stage.has-strip {
          aspect-ratio: 8 / 4;
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
          }
          .stage.has-strip {
            aspect-ratio: 4 / 5;
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
        .fact-v.amber {
          color: var(--amber);
          font-weight: 600;
        }
        .fact-v.slate {
          color: var(--slate);
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
          min-width: 42px;
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
        :global(.mlab) :focus-visible {
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
