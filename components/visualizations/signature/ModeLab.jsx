'use client';

/* ============================================================================
   ModeLab — an interactive "bench" for the MODE: the value that shows up MOST
   OFTEN in a data set.  Build a frequency chart by clicking columns, and the
   tallest column(s) light up carmine — that is the mode.  The lab is built to
   reveal three things a dot-plot of the mean never quite says out loud:
     • the mode lives in FREQUENCY — it is the tallest column, the value with the
       greatest count, full stop;
     • a data set can have NO mode, ONE (unimodal), TWO (bimodal), or MANY
       (multimodal) modes — you find out by counting the tallest columns;
     • the mode is the ONLY average that works for CATEGORIES (favorite fruit,
       favorite color) — things you cannot add or line up in order, so the mean
       and the median simply do not exist, but the "most popular" always does.

   Built for MAIS (math AI system, www.mais.ac), K-12.  Pitched at grades 5–7
   (CCSS 6.SP.A.3 "a measure of center summarizes a data set with a single
   number"; 6.SP.B.5.c "give measures of center — median and/or mean — and also
   the mode"; 3.MD-style scaled picture/bar graphs feed straight into it).  A
   child who can count meets the first, friendliest average: no adding, no
   dividing — just "which happened the most?"

   HOUSE STYLE — the interactive-math-bench standard: a quadrille-paper canvas,
   tools that unlock one per lesson step, predict-then-check questions (Next is
   gated on ANSWERED, not on correct), and a calibration challenge with a live
   match meter and a CALIBRATED stamp.  Deliberately DISTINCT from its sibling
   DataLab (which owns the number-line DOT PLOT and the mean as a BALANCE POINT,
   with the mode a quiet gold secondary): here the mode is the STAR.

   One-accent discipline: CARMINE is the mathematical object the lab reveals —
   the MODE.  The mode column(s), the "highest frequency" line, the mode flags,
   and the mode readout all share the carmine accent; NOTHING else does.  The
   contrast markers for the OTHER centers stay deliberately quiet so they never
   fight the accent: the mean is slate-grey, the median is blue.  Green is
   reserved for "correct" and "CALIBRATED".

   EXACT integer arithmetic — a K-12 student never meets a float artefact:
     • the data IS a frequency table (an array of counts), so the mode is found
       by an exact integer max — no rounding can ever creep in;
     • the comparison mean is kept as the reduced fraction (Σ value·count)/n and
       rendered as an integer, an exact terminating decimal (by integer long
       division), or a clearly-marked "≈" 2-decimal rounding;
     • the comparison median is a value or a clean half.

   THE "NO MODE" RULE (stated plainly, because textbooks vary):
       The mode is the value that appears MOST OFTEN.  If two or more values are
       tied for most, they are ALL modes.  If EVERY value that appears occurs
       equally often — so no value appears more often than the others — there is
       NO mode.
   This is the widely-taught convention and it is applied consistently here and
   checked exhaustively in audit-mode.mjs.

   DROP-IN USAGE (Next.js, app router or pages router):
     1. Save this file anywhere in your project, e.g.
          app/labs/ModeLab.jsx
     2. Import and render it:
          import ModeLab from './ModeLab';
          export default function Page() { return <ModeLab />; }
   Zero dependencies.  Styles are scoped with styled-jsx (built into Next.js),
   so nothing here can leak into or collide with the host app.  JS/TS agnostic.

   Architecture (the bench spine):
     STATE  — React state is the single source of truth: the frequency table
              (counts[]), the numbers/categories toggle, which lenses are on,
              the lesson step.
     MODEL  — the mode + classification are exact integer logic; they know no
              pixels.
     RENDER — the canvas is fully redrawn from state on every change.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   EDIT 1 — Parameters.  The "dials" here are LENSES, not sliders: the data is
   built by clicking columns of a frequency chart, and each lens unlocks one per
   lesson step and overlays a new idea — so the picture is never ahead of the
   idea.  The state is stored AS a frequency table (an array of counts), which
   is exactly what the mode is read from.
   ------------------------------------------------------------------------- */
const NUM_K = 8;           // numeric values 1…8 (eight columns)
const MAX_STACK = 8;       // tallest a single column can grow
const MAX_TOTAL = 24;      // total chips (data points) across all columns

// the five survey categories used once "Fruits" is switched on
const CATS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Lemon'];

// friendly starting data: a clear single mode at value 4 (unimodal), n = 10
const START_NUM = [0, 1, 2, 4, 2, 1, 0, 0];
// a favorite-fruit survey with a clear mode (Banana), n = 11
const START_CAT = [2, 4, 1, 3, 1];
// a deliberately SKEWED set for the "mode vs. the middle" step: the mode sits at
// the low end (value 2), while a long right tail pulls the mean up and the median
// between them — so mode = 2, median = 3.5, mean = 4.1 all read differently.
const START_CONTRAST = [0, 4, 1, 1, 1, 1, 1, 1];

const STEP_BUILD = 0;    // meet frequency — build the chart
const STEP_FREQ = 1;     // frequency — the count of each value (Counts lens)
const STEP_MODE = 2;     // the mode — the tallest column (Mode lens)
const STEP_COUNT = 3;    // how many modes? none / one / two / many
const STEP_CAT = 4;      // mode is the only average for categories (Fruits)
const STEP_CONTRAST = 5; // mode vs. the middle (Compare lens: mean + median)
const STEP_CALIB = 6;    // build a set with the target mode (calibration)

// lenses, unlocked as the lesson earns them
const LENSES = [
  { key: 'counts', unlock: STEP_FREQ, color: '#5b6b7b', name: 'Counts', role: 'label each frequency' },
  { key: 'mode', unlock: STEP_MODE, color: '#c81e4f', name: 'Mode', role: 'light the tallest column' },
  { key: 'compare', unlock: STEP_CONTRAST, color: '#3f74a6', name: 'Compare', role: 'mark the mean & median' },
];

/* ---------------------------------------------------------------------------
   EDIT 2 — Model.  The mode + its classification, EXACT.  Everything is derived
   from the integer frequency table `counts`; nothing here knows a pixel.

   `counts[i]` is the frequency of the i-th value.  For numbers, value = i + 1;
   for categories, value = CATS[i].  The mode(s) are returned as INDICES.
   ------------------------------------------------------------------------- */
function computeMode(counts) {
  let n = 0;
  let maxFreq = 0;
  let minFreq = Infinity;
  const present = [];
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    n += c;
    if (c > 0) {
      present.push(i);
      if (c > maxFreq) maxFreq = c;
      if (c < minFreq) minFreq = c;
    }
  }
  if (present.length === 0) {
    return { n: 0, maxFreq: 0, minFreq: 0, present: [], modes: [], noMode: false, distinct: 0 };
  }
  const atMax = present.filter((i) => counts[i] === maxFreq);
  // NO mode when every value that appears is equally frequent (a full tie):
  const noMode = present.length >= 2 && atMax.length === present.length;
  return {
    n,
    maxFreq,
    minFreq,
    present,
    modes: noMode ? [] : atMax.slice(),
    noMode,
    distinct: present.length,
  };
}

// how many modes → the shape word
function caseName(m) {
  if (m.n === 0) return '—';
  if (m.noMode) return 'no mode';
  const k = m.modes.length;
  return k === 1 ? 'unimodal' : k === 2 ? 'bimodal' : 'multimodal';
}

// value labels: numbers are i+1, categories are their name
const valLabel = (i, catMode) => (catMode ? CATS[i] : String(i + 1));

// the mode as a human string ("4", "2 & 4", "none", "—")
function modeString(m, catMode) {
  if (m.n === 0) return '—';
  if (m.noMode) return 'none';
  return m.modes.map((i) => valLabel(i, catMode)).join(catMode ? ', ' : ' & ');
}

/* ---- exact rational formatting (for the numeric comparison mean/median) ---- */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function reduceFrac(num, den) {
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}
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
function fmtRatio(num, den) {
  const r = reduceFrac(num, den);
  if (r.den === 1) return { text: String(r.num), approx: false, value: r.num };
  if (terminates(r.den)) return { text: longDivide(r.num, r.den), approx: false, value: num / den };
  return { text: roundedHundredths(r.num, r.den), approx: true, value: num / den };
}

// numeric-only comparison centers (mean & median) from the count table.
// values are 1…NUM_K; used purely to CONTRAST with the mode.
function numericCenters(counts) {
  let n = 0;
  let sumV = 0;
  for (let i = 0; i < counts.length; i++) {
    n += counts[i];
    sumV += counts[i] * (i + 1);
  }
  if (n === 0) return { n: 0, mean: null, median: null, meanFmt: null, medianFmt: null };
  // median: expand positions via cumulative counts, take the two middle values
  const midLo = Math.floor((n - 1) / 2);
  const midHi = Math.ceil((n - 1) / 2);
  let cum = 0;
  let vLo = null;
  let vHi = null;
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c === 0) continue;
    const start = cum;
    const end = cum + c - 1;
    if (vLo === null && midLo >= start && midLo <= end) vLo = i + 1;
    if (midHi >= start && midHi <= end) vHi = i + 1;
    cum += c;
  }
  // median = (vLo + vHi) / 2 always; reduceFrac collapses it to an integer when
  // the two middle values are the same (den 1) or a clean half otherwise (den 2)
  const medFmt = fmtRatio(vLo + vHi, 2);
  const meanFmt = fmtRatio(sumV, n);
  return { n, mean: meanFmt.value, median: medFmt.value, meanFmt, medianFmt: medFmt };
}

/* ---------------------------------------------------------------------------
   EDIT 6 — Calibration.  A CONSTRUCTION GOAL (the skill's sanctioned
   alternative to curve-matching): the student is given a target mode and builds
   ANY data set that achieves it.  Two goal kinds, both numeric:
     • "unimodal v" — make the value v the single tallest column;
     • "none"       — make every value that appears equally frequent (no mode).
   Many sets win each goal, which is the point.  The meter reads set-overlap so
   it climbs as the build gets closer, and CALIBRATED is an exact structural hit.
   ------------------------------------------------------------------------- */
function setEq(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  for (const x of b) if (!s.has(x)) return false;
  return true;
}

// m here is a VALUE-space mode summary: { n, maxFreq, minFreq, modeValues, noMode, distinct }
function calibMatch(target, m) {
  if (target.kind === 'none') {
    if (m.n === 0) return { pct: 0, done: false };
    if (m.noMode) return { pct: 100, done: m.distinct >= 2 && m.n >= 3 };
    // not flat yet: closeness = how small the tallest-vs-shortest gap is
    const spread = m.maxFreq - m.minFreq; // ≥ 1 when a winner exists
    const pct = Math.min(90, Math.max(0, 100 - spread * 34));
    return { pct, done: false };
  }
  // "unimodal" (or, kept general, a set target): overlap of mode sets
  const S = target.values; // e.g. [v]
  const M = m.modeValues; // [] when empty / no mode
  const inter = M.filter((x) => S.includes(x)).length;
  const union = new Set([...S, ...M]).size;
  const pct = union ? (100 * inter) / union : 0;
  const done = setEq(M, S) && m.n >= 3;
  return { pct, done };
}

function makeTarget(prev) {
  let t;
  do {
    // ~2/3 unimodal, ~1/3 no-mode — both clearly reachable by clicking
    if (Math.random() < 0.66) {
      const v = 2 + Math.floor(Math.random() * 6); // value 2…7
      t = { kind: 'unimodal', values: [v], v };
    } else {
      t = { kind: 'none', values: [] };
    }
  } while (prev && sameTarget(t, prev));
  return t;
}
function sameTarget(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'none') return true;
  return a.v === b.v;
}

/* ---------------------------------------------------------------------------
   EDIT 5 — Equation display.  The MODE is the star, in the carmine accent, with
   small chips for n, the top frequency, and how many distinct values there are.
   Rendered by a CHILD component so styles are INLINED (styled-jsx only scopes a
   component's own JSX) — identical in Next.js and in any plain preview.
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
function ModeEquation({ starText, n, maxFreq, distinct, hasData }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '7px' }}>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '27px',
            fontWeight: 700,
            color: '#c81e4f',
            letterSpacing: '0.01em',
          }}
        >
          {starText}
        </span>
      </span>
      <span style={{ ...CHIP_BASE, color: '#1c2b3a', background: 'rgba(28,43,58,0.08)' }}>n = {n}</span>
      {hasData && (
        <span style={{ ...CHIP_BASE, color: '#b07a17', background: 'rgba(217,152,43,0.14)' }}>
          top frequency = {maxFreq}
        </span>
      )}
      {hasData && (
        <span style={{ ...CHIP_BASE, color: '#3f74a6', background: 'rgba(63,116,166,0.12)' }}>
          {distinct} distinct value{distinct === 1 ? '' : 's'}
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EDIT 4 — Lesson.  One idea per step; the lens unlocks with the step; the
   reveal lives in `feedback` (shown after answering); distractors are real
   misconceptions ("the mode is the biggest number," "frequency is the value
   itself," "every average works for words").  Next is gated on ANSWERED.
   ------------------------------------------------------------------------- */
const STEPS = [
  {
    title: 'Build a frequency chart',
    body:
      'Each data point is one chip. Click a column to stack a chip on that value; click a chip to take ' +
      'it away. The taller a column, the more often that value shows up — and that height has a name: ' +
      'the value’s FREQUENCY. Stack a few columns and watch the shape appear.',
    q: 'A column that is 5 chips tall tells you…',
    choices: ['That value occurred 5 times', 'That value equals 5', '5 is the biggest value'],
    answer: 0,
    feedback:
      'Height counts how OFTEN a value happens, not how big it is. Five chips over the value 4 means 4 ' +
      'came up five times. The column’s position names the value; its height names the frequency.',
  },
  {
    title: 'Frequency — the count of each value',
    body:
      'Turn on the Counts lens to label every column with its frequency — the number of chips in it. ' +
      'These counts are the raw material for the mode: in a moment we go hunting for the biggest one. ' +
      'The frequencies always add up to n, the number of data points.',
    q: 'In the data 2, 2, 2, 5, 5, 9, what is the frequency of 2?',
    choices: ['3 — it appears three times', '2 — because the value is two', '6 — there are six numbers in all'],
    answer: 0,
    feedback:
      'The value 2 appears three times, so its frequency is 3. Frequency counts the repeats of ONE value; ' +
      'it is not the value itself (2), and not the size of the whole set (n = 6).',
  },
  {
    title: 'The mode — the tallest column',
    body:
      'The MODE is the value with the greatest frequency — the tallest column, glowing carmine, with a ' +
      'dashed line marking its height. The word comes from the French à la mode, “in fashion”: the mode ' +
      'is the most popular value. It is also the only center that is always an actual value in the set.',
    q: 'Which value is the mode of  3, 7, 7, 7, 9 ?',
    choices: ['7 — it appears most often', '9 — it is the largest', '7 — it is in the middle'],
    answer: 0,
    feedback:
      '7 has frequency 3, more than any other value, so 7 is the mode. The mode is about the TALLEST ' +
      'column, not the largest number (9) — a classic mix-up. Here it is also a real value in the set, ' +
      'as the mode always is.',
  },
  {
    title: 'How many modes? none, one, or many',
    body:
      'Count the tallest columns. One clear winner → the set is UNIMODAL. Two tied for tallest → BIMODAL. ' +
      'Three or more tied → MULTIMODAL. And if every value that appears is equally frequent — nobody wins — ' +
      'there is NO mode. Try the One mode / Two modes / No mode presets and watch the banner.',
    q: 'How many modes does  1, 1, 2, 2, 5  have?',
    choices: ['Two — 1 and 2 tie for most frequent (bimodal)', 'One — 5, the largest value', 'None — nothing stands out'],
    answer: 0,
    feedback:
      '1 and 2 each appear twice — more often than 5 — so both are modes: the set is bimodal. (If ALL of ' +
      '1, 2, and 5 had appeared the same number of times, no value would stand out and there would be no mode.)',
  },
  {
    title: 'Mode is the only average for words',
    body:
      'Press Fruits to survey favorite fruits. You cannot add favorite fruits or line them up by size, so ' +
      'the mean and the median simply do not exist — there is no “average fruit.” But the MODE still works: ' +
      'it is just the most popular choice. That is the mode’s superpower — the one center that fits categories.',
    q: 'For a survey of favorite fruit, which average makes sense?',
    choices: ['Only the mode — the most-chosen fruit', 'The mean — add the fruits and divide', 'The median — the middle fruit'],
    answer: 0,
    feedback:
      'Fruits are categories: you cannot total them or sort them by size, so the mean and median are ' +
      'undefined. Only the mode — the most frequently chosen fruit — makes sense for non-numerical data.',
  },
  {
    title: 'Mode vs. the middle',
    body:
      'Back to numbers. Turn on Compare to mark the mean (slate) and the median (blue). Notice the mode need ' +
      'not sit near them — it can be the smallest or the largest value, wherever the tallest column happens ' +
      'to be. The mode follows popularity, not position. Drag one column high at the far end and see.',
    q: 'Can the mode be the largest value in a data set?',
    choices: ['Yes — if the largest value is the most frequent', 'No — the mode is always in the middle', 'No — the mode is always the smallest'],
    answer: 0,
    feedback:
      'Yes. The mode is wherever the tallest column is. If the biggest value repeats most, it is the mode. ' +
      'Unlike the median (a position) or the mean (a balance), the mode can sit anywhere — even at an extreme.',
  },
  {
    title: 'Build the target mode',
    body:
      'Final challenge. Read the goal, then build a data set that meets it — give one value the tallest ' +
      'column all to itself, or make every column that has chips the same height so there is no mode. Many ' +
      'sets win. The meter reads CALIBRATED when your mode matches the goal. Press “New goal” for another.',
    calib: true,
  },
];

/* ============================================================================
   COMPONENT
   ========================================================================== */
export default function ModeLab() {
  const [counts, setCounts] = useState(START_NUM);
  const [catMode, setCatMode] = useState(false); // false = Numbers, true = Fruits
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: chosenIndex }
  const [target, setTarget] = useState(null); // calibration goal
  const [lensOn, setLensOn] = useState({ counts: false, mode: false, compare: false });

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const geoRef = useRef({}); // layout geometry: written by draw(), read by pointer handlers
  const sceneRef = useRef({}); // snapshot the renderer reads
  const hoverColRef = useRef(null); // hovered column index or null

  const current = STEPS[step];
  const calib = !!current.calib;

  const K = counts.length;
  const m = computeMode(counts);
  const centers = catMode ? { n: m.n, mean: null, median: null, meanFmt: null, medianFmt: null } : numericCenters(counts);

  // effective lenses — a lens only draws once its step is reached
  const eff = {
    counts: lensOn.counts && step >= STEP_FREQ,
    mode: lensOn.mode && step >= STEP_MODE,
    compare: lensOn.compare && step >= STEP_CONTRAST && !catMode,
  };

  const hasData = m.n > 0;
  const modeStr = modeString(m, catMode);
  const shapeStr = caseName(m);
  const starText = m.n === 0 ? '—' : m.noMode ? 'no mode' : (m.modes.length > 1 ? 'Modes = ' : 'Mode = ') + modeStr;

  // value-space mode summary for the calibration meter (numeric only)
  const modeValues = m.modes.map((i) => i + 1);
  const vm = { n: m.n, maxFreq: m.maxFreq, minFreq: m.minFreq, modeValues, noMode: m.noMode, distinct: m.distinct };
  const calResult = calib && target ? calibMatch(target, vm) : { pct: 0, done: false };
  const matchPct = calResult.pct;
  const calibrated = calResult.done;

  // snapshot everything the renderer needs so draw() (a stable callback) and the
  // pointer handlers never read stale values.
  sceneRef.current = {
    counts,
    K,
    catMode,
    m,
    eff,
    centers,
    calib,
    target,
    calibrated,
    hoverCol: hoverColRef.current,
  };

  /* ---- full redraw from state -------------------------------------------- */
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

    /* palette (kept in one place, matched to the CSS tokens) */
    const INK = '#1C2B3A';
    const INK_SOFT = '#5B6B7B';
    const CARMINE = '#C81E4F'; // the MODE — the one accent
    const CARM_FILL = 'rgba(200,30,79,0.90)';
    const CARM_EDGE = '#9c153b';
    const BLUE = '#3F74A6'; // the median (contrast only)
    const SLATE = '#5B6B7B'; // the mean (contrast only)
    const CHIP = 'rgba(63,116,166,0.22)'; // a plain (non-mode) chip fill
    const CHIP_EDGE = 'rgba(28,43,58,0.32)';
    const AXIS = 'rgba(28,43,58,0.55)';

    const S = sceneRef.current;
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

    /* ---- regions ----------------------------------------------------------- */
    const padL = 44; // frequency scale
    const padR = 20;
    const padTop = 44; // room for flags / mode line / pill
    const padBot = 52; // category labels + contrast ticks
    const baseY = Hd - padBot; // the baseline
    const plotW = Wd - padL - padR;
    const plotH = baseY - padTop;
    const KK = S.K;
    const colStep = plotW / KK;
    const rowH = plotH / MAX_STACK; // height of one chip-row
    const xCenter = (k) => padL + (k + 0.5) * colStep;
    // continuous value → x, for the contrast ticks (value v sits at column v-1)
    const xOfValue = (v) => padL + (v - 0.5) * colStep;
    const chipW = Math.min(colStep * 0.62, 34);
    const chipH = Math.min(rowH * 0.82, chipW);

    /* caption */
    ctx.fillStyle = INK_SOFT;
    ctx.font = '600 12px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      S.catMode ? 'favorite-fruit survey — each chip is one vote' : 'frequency chart — each chip is one data point',
      padL,
      8
    );

    /* ---- frequency axis (left) + gridlines when Counts is on -------------- */
    if (S.eff.counts) {
      ctx.strokeStyle = 'rgba(28,43,58,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let f = 0; f <= MAX_STACK; f++) {
        const Y = Math.round(baseY - f * rowH) + 0.5;
        ctx.moveTo(padL, Y);
        ctx.lineTo(Wd - padR, Y);
      }
      ctx.stroke();
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let f = 0; f <= MAX_STACK; f += 2) ctx.fillText(String(f), padL - 8, baseY - f * rowH);
      // axis title
      ctx.save();
      ctx.translate(13, (padTop + baseY) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText('frequency', 0, 0);
      ctx.restore();
    }

    /* ---- hovered column band ---------------------------------------------- */
    if (S.hoverCol != null && S.hoverCol >= 0 && S.hoverCol < KK) {
      const X = xCenter(S.hoverCol);
      ctx.fillStyle = 'rgba(63,116,166,0.08)';
      ctx.fillRect(X - colStep / 2, padTop, colStep, baseY - padTop);
    }

    /* ---- the baseline ------------------------------------------------------ */
    ctx.strokeStyle = AXIS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL - 6, baseY + 0.5);
    ctx.lineTo(Wd - padR + 6, baseY + 0.5);
    ctx.stroke();

    const modeSet = new Set(S.eff.mode ? S.m.modes : []);

    /* ---- MODE lens: dashed "highest frequency" line ----------------------- */
    if (S.eff.mode && S.m.n > 0 && !S.m.noMode) {
      const y = baseY - S.m.maxFreq * rowH;
      ctx.save();
      ctx.strokeStyle = 'rgba(200,30,79,0.55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(Wd - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CARMINE;
      ctx.font = '700 10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('highest frequency = ' + S.m.maxFreq, Wd - padR, y - 3);
      ctx.restore();
    }

    /* ---- the columns of chips --------------------------------------------- */
    for (let k = 0; k < KK; k++) {
      const c = S.counts[k];
      const isMode = modeSet.has(k);
      const cx = xCenter(k);
      for (let j = 0; j < c; j++) {
        const yTop = baseY - (j + 1) * rowH + (rowH - chipH) / 2;
        roundRect(ctx, cx - chipW / 2, yTop, chipW, chipH, 4);
        ctx.fillStyle = isMode ? CARM_FILL : CHIP;
        ctx.fill();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = isMode ? CARM_EDGE : CHIP_EDGE;
        ctx.stroke();
      }

      /* count label above the column (Counts lens) */
      if (S.eff.counts && c > 0) {
        ctx.fillStyle = isMode ? CARMINE : INK_SOFT;
        ctx.font = '700 12px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(c), cx, baseY - c * rowH - 4);
      }

      /* MODE flag above the mode column(s) */
      if (isMode) {
        const flagY = baseY - S.m.maxFreq * rowH - (S.eff.counts ? 20 : 6);
        ctx.fillStyle = CARMINE;
        ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('mode', cx, flagY);
      }

      /* category label below the baseline */
      const isTargetCol =
        S.calib && S.target && S.target.kind === 'unimodal' && !S.catMode && S.target.v === k + 1;
      ctx.fillStyle = isTargetCol ? SLATE : modeSet.has(k) ? CARMINE : INK;
      ctx.font =
        (S.catMode ? '600 10.5px' : '700 12px') + ' ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(valLabel(k, S.catMode), cx, baseY + 7);
    }

    /* ---- COMPARE lens: mean (slate) & median (blue) markers --------------- */
    // Labels are anchored at the TOP of each dashed line as small pills — kept
    // away from the baseline so they never crowd the category labels or the hint;
    // the two are staggered in height so they stay legible even when mean ≈ median.
    if (S.eff.compare && S.centers.n > 0) {
      const drawMarker = (v, color, label, yTop) => {
        const X = xOfValue(v);
        ctx.save();
        // dashed line from just under its label down to the baseline
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(X, yTop + 15);
        ctx.lineTo(X, baseY - 1);
        ctx.stroke();
        ctx.setLineDash([]);
        // small marker triangle sitting on the baseline, pointing up
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(X, baseY - 1);
        ctx.lineTo(X - 4, baseY - 8);
        ctx.lineTo(X + 4, baseY - 8);
        ctx.closePath();
        ctx.fill();
        // top pill label (clamped to stay inside the plot)
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        const tw = ctx.measureText(label).width;
        const bw = tw + 12;
        const bh = 15;
        const px = Math.min(Math.max(X, padL + bw / 2), Wd - padR - bw / 2);
        roundRect(ctx, px - bw / 2, yTop, bw, bh, 4);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px, yTop + bh / 2 + 0.5);
        ctx.restore();
      };
      const meanLabel = 'mean ' + (S.centers.meanFmt.approx ? '≈' + S.centers.meanFmt.text : S.centers.meanFmt.text);
      // sit the pills in the (usually empty) upper rows of the plot, below the
      // caption and above the short columns; staggered so they never overlap
      drawMarker(S.centers.mean, SLATE, meanLabel, padTop + 4);
      drawMarker(S.centers.median, BLUE, 'median ' + S.centers.medianFmt.text, padTop + 21);
    }

    /* ---- calibration goal marker ------------------------------------------ */
    if (S.calib && S.target) {
      if (S.target.kind === 'unimodal' && !S.catMode) {
        const X = xCenter(S.target.v - 1);
        ctx.save();
        ctx.strokeStyle = 'rgba(91,107,123,0.9)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(X - colStep / 2 + 3, padTop + 2, colStep - 6, baseY - padTop - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(91,107,123,0.95)';
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('goal: tallest here', X, padTop);
        ctx.restore();
      } else if (S.target.kind === 'none') {
        ctx.save();
        ctx.fillStyle = 'rgba(91,107,123,0.95)';
        ctx.font = '700 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('goal: every column the same height (no mode)', (padL + Wd - padR) / 2, padTop);
        ctx.restore();
      }
    }

    /* ---- empty-state prompt ------------------------------------------------ */
    if (S.m.n === 0) {
      ctx.fillStyle = INK_SOFT;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click a column to add a data point', (padL + Wd - padR) / 2, (padTop + baseY) / 2);
    }

    /* store geometry for hit-testing */
    geoRef.current = { padL, padR, padTop, baseY, plotW, colStep, rowH, KK, chipW };
  }, []);

  /* redraw whenever state that affects the picture changes */
  useEffect(() => {
    draw();
  }, [counts, catMode, step, target, lensOn, draw]);

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

  /* the "mode vs. the middle" step is numeric and wants a skewed set so the
     three centers visibly separate — seed it on arrival (calibration seeds its
     own empty set below). */
  useEffect(() => {
    if (step === STEP_CONTRAST) {
      setCatMode(false);
      setCounts(START_CONTRAST);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* set up the calibration goal the first time we reach it; start from empty */
  useEffect(() => {
    if (current.calib && target == null) {
      setCatMode(false);
      setTarget(makeTarget(null));
      setCounts(emptyNum());
      // show the Counts + Mode lenses; drop Compare so the goal canvas stays clean
      setLensOn((prev) => ({ ...prev, counts: true, mode: true, compare: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* keep the scene's hover column fresh for the renderer */
  sceneRef.current.hoverCol = hoverColRef.current;

  /* ---- interaction: click a column to add, click a chip to remove -------- */
  const colAt = (cssX) => {
    const g = geoRef.current;
    if (!g.colStep) return -1;
    const k = Math.floor((cssX - g.padL) / g.colStep);
    return k >= 0 && k < g.KK ? k : -1;
  };

  const onPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g.colStep) return;
    const k = colAt(cssX);
    if (k < 0 || cssY > g.baseY + 4 || cssY < g.padTop - 20) return;

    // which chip-row (from the baseline up) is under the cursor?
    const row = Math.floor((g.baseY - cssY) / g.rowH);
    setCounts((arr) => {
      const c = arr[k];
      // clicking a filled chip removes one from that column
      if (row >= 0 && row < c) {
        const next = arr.slice();
        next[k] = c - 1;
        return next;
      }
      // clicking empty space above the stack adds one (respecting the caps)
      const total = arr.reduce((a, b) => a + b, 0);
      if (row >= 0 && row < MAX_STACK && c < MAX_STACK && total < MAX_TOTAL) {
        const next = arr.slice();
        next[k] = c + 1;
        return next;
      }
      return arr;
    });
  };

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const g = geoRef.current;
    if (!g.colStep) return;
    let col = null;
    if (cssY > g.padTop - 20 && cssY < g.baseY + 4) {
      const k = colAt(cssX);
      if (k >= 0) col = k;
    }
    if (col !== hoverColRef.current) {
      hoverColRef.current = col;
      draw();
    }
  };
  const onPointerLeave = () => {
    if (hoverColRef.current != null) {
      hoverColRef.current = null;
      draw();
    }
  };

  /* ---- presets & toolbar ------------------------------------------------- */
  function emptyNum() {
    return new Array(NUM_K).fill(0);
  }
  const applyNum = (arr) => {
    if (catMode) setCatMode(false);
    setCounts(arr.slice());
  };
  const randomSet = () => {
    const arr = emptyNum();
    let total = 0;
    const picks = 6 + Math.floor(Math.random() * 8); // 6…13 data points
    for (let i = 0; i < picks && total < MAX_TOTAL; i++) {
      const k = Math.floor(Math.random() * NUM_K);
      if (arr[k] < MAX_STACK) {
        arr[k]++;
        total++;
      }
    }
    applyNum(arr);
  };
  const clearData = () => applyNum(emptyNum());

  const toggleCat = (on) => {
    if (step < STEP_CAT) return;
    if (on === catMode) return;
    setCatMode(on);
    setCounts(on ? START_CAT.slice() : START_NUM.slice());
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

  const newGoal = () => {
    setTarget(makeTarget(target));
    setCounts(emptyNum());
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setTarget(null);
    setCatMode(false);
    setLensOn({ counts: false, mode: false, compare: false });
    setCounts(START_NUM);
  };

  /* goal text + hint for the calibration panel */
  let goalText = '';
  let goalHint = '';
  if (calib && target) {
    if (target.kind === 'unimodal') {
      goalText = 'Make the mode exactly ' + target.v + '.';
      goalHint = m.n < 3 ? 'add at least 3 chips' : 'give ' + target.v + ' the single tallest column';
    } else {
      goalText = 'Make the data have NO mode.';
      goalHint = m.distinct < 2 ? 'use at least two different values' : 'level every column that has chips';
    }
  }

  /* spoken description (accessibility) */
  const spoken =
    m.n === 0
      ? 'The chart is empty. Click a column to add a data point.'
      : `A ${catMode ? 'survey' : 'data set'} of ${m.n} value${m.n === 1 ? '' : 's'}. ` +
        (eff.mode || step >= STEP_MODE
          ? m.noMode
            ? 'There is no mode: every value that appears occurs equally often. '
            : `The mode is ${modeStr}, with a frequency of ${m.maxFreq}. The set is ${shapeStr}. `
          : `The tallest frequency is ${m.maxFreq}. `) +
        (eff.compare && centers.n > 0 ? `For contrast, the mean is ${centers.meanFmt.approx ? 'about ' : ''}${centers.meanFmt.text} and the median is ${centers.medianFmt.text}. ` : '');

  return (
    <div className="mlab">
      <header className="head">
        <p className="eyebrow">MAIS · Interactive Math Lab</p>
        <h1>Mode — the Most Popular Value</h1>
        <p className="lede">
          The <em>mode</em> is the friendliest average: no adding, no dividing — just{' '}
          <em>which value shows up the most?</em> Build a{' '}
          <span className="mono">frequency chart</span> and the tallest column lights up. Along the way, meet
          data sets with <em>one</em> mode, <em>two</em>, or <em>none</em> — and discover the mode’s superpower:
          it is the only average that works for <em>words</em>, like a favorite fruit.
        </p>
      </header>

      <div className="bench">
        {/* ---------- STAGE ---------- */}
        <section className="panel stage-panel">
          <div className="stage-head">
            <p className="equation">
              <ModeEquation starText={starText} n={m.n} maxFreq={m.maxFreq} distinct={m.distinct} hasData={hasData} />
            </p>
            <p className="equation-sub mono">
              {m.n === 0
                ? 'click a column to add data'
                : m.noMode
                ? `every value that appears occurs ${m.maxFreq} time${m.maxFreq === 1 ? '' : 's'} — no value wins`
                : `mode = the value with the greatest frequency  ·  shape: ${shapeStr}`}
            </p>
          </div>

          <div
            className="stage"
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            role="img"
            aria-label={spoken}
          >
            <canvas ref={canvasRef} />
            <span className="hint mono">click a column to add · click a chip to remove</span>
          </div>
          <p className="sr-only" aria-live="polite">
            {spoken}
            {calib && calibrated ? ' Calibrated — your mode matches the goal.' : ''}
          </p>

          <div className="facts">
            <div className="fact">
              <span className="fact-k">Mode</span>
              <span className="fact-v mono carm big">{hasData ? modeStr : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Top frequency</span>
              <span className="fact-v mono gold">{hasData ? m.maxFreq : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Modes</span>
              <span className="fact-v mono">{hasData ? (m.noMode ? '0 · none' : m.modes.length + ' · ' + shapeStr) : '—'}</span>
            </div>
            <div className="fact">
              <span className="fact-k">Data points</span>
              <span className="fact-v mono">{m.n}</span>
            </div>
          </div>

          <div className="toolbar">
            <div className={'seg' + (step < STEP_CAT ? ' seg-locked' : '')} role="group" aria-label="Data type">
              <button
                type="button"
                className={'segbtn' + (!catMode ? ' on' : '')}
                onClick={() => toggleCat(false)}
                disabled={step < STEP_CAT}
                aria-pressed={!catMode}
              >
                Numbers
              </button>
              <button
                type="button"
                className={'segbtn' + (catMode ? ' on' : '')}
                onClick={() => toggleCat(true)}
                disabled={step < STEP_CAT}
                aria-pressed={catMode}
              >
                Fruits
              </button>
            </div>
            {!catMode ? (
              <>
                <button type="button" className="btn ghost" onClick={() => applyNum([0, 1, 2, 4, 2, 1, 0, 0])}>
                  One mode
                </button>
                <button type="button" className="btn ghost" onClick={() => applyNum([0, 3, 1, 3, 1, 0, 0, 0])}>
                  Two modes
                </button>
                <button type="button" className="btn ghost" onClick={() => applyNum([0, 2, 2, 2, 0, 0, 0, 0])}>
                  No mode
                </button>
                <button type="button" className="btn ghost" onClick={randomSet}>
                  Random
                </button>
              </>
            ) : (
              <button type="button" className="btn ghost" onClick={() => setCounts(START_CAT.slice())}>
                New survey
              </button>
            )}
            <button type="button" className="btn ghost" onClick={clearData} disabled={m.n === 0}>
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

          <div className="lenses" role="group" aria-label="Lenses">
            {LENSES.map((l) => {
              const unlocked = step >= l.unlock;
              const on = unlocked && lensOn[l.key] && !(l.key === 'compare' && catMode);
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
              <p className="goal mono">
                <span className="goal-k">Goal</span> {goalText}
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter-fill" style={{ width: matchPct.toFixed(0) + '%' }} />
              </div>
              <div className="meter-row">
                <span className="mono">match&nbsp;{matchPct.toFixed(0)}%</span>
                {calibrated ? (
                  <span className="stamp">CALIBRATED</span>
                ) : (
                  <span className="mono target-hint">{goalHint}</span>
                )}
              </div>
              <button type="button" className="btn ghost" onClick={newGoal}>
                New goal
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
              <button type="button" className="btn" onClick={restart}>
                Restart lab
              </button>
            )}
          </div>
        </aside>
      </div>

      <footer className="foot">
        <span className="mono">mode = the value with the greatest frequency</span> &nbsp;·&nbsp; a set can have one
        mode, several, or none &nbsp;·&nbsp; the mode is the only average that works for categories (CCSS 6.SP).
        Numbers here run 1–8; the same ideas scale to any data.
      </footer>

      <style jsx>{`
        .mlab {
          --page: #eff1ee;
          --paper: #fbfbf8;
          --ink: #1c2b3a;
          --ink-soft: #5b6b7b;
          --curve: #c81e4f;
          --median: #3f74a6;
          --gold: #d9982b;
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
        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 8 / 5;
          margin: 0 auto;
          border: 1px solid var(--quad);
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
          cursor: pointer;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7f9 100%);
        }
        @media (max-width: 560px) {
          .stage {
            aspect-ratio: 1 / 1;
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
        .fact-v.gold {
          color: #b07a17;
          font-weight: 600;
        }
        .toolbar {
          margin: 12px 4px 2px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .seg {
          display: inline-flex;
          border: 1px solid rgba(28, 43, 58, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }
        .seg-locked {
          opacity: 0.45;
        }
        .segbtn {
          font: 600 13px/1 system-ui, sans-serif;
          padding: 9px 13px;
          border: 0;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .segbtn + .segbtn {
          border-left: 1px solid rgba(28, 43, 58, 0.2);
        }
        .segbtn.on {
          background: var(--ink);
          color: #fff;
        }
        .segbtn:disabled {
          cursor: not-allowed;
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
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 4px;
        }
        @media (max-width: 460px) {
          .lenses {
            grid-template-columns: 1fr;
          }
        }
        .lens {
          display: grid;
          grid-template-columns: 12px 1fr;
          grid-template-rows: auto auto auto;
          align-items: start;
          gap: 2px 8px;
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
          grid-row: 1;
          grid-column: 1;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-top: 2px;
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
          grid-column: 2;
          grid-row: 3;
          font-size: 11px;
          font-weight: 700;
          color: var(--ink-soft);
          margin-top: 2px;
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
        .goal {
          margin: 0;
          font-size: 13px;
          color: var(--ink);
        }
        .goal-k {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
          background: var(--ink-soft);
          border-radius: 4px;
          padding: 2px 6px;
          margin-right: 6px;
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
          .segbtn,
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

/* small rounded-rectangle helper for the chips */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
