/* ============================================================================
   audit-lineplot.mjs — numeric + structural proof for LinePlotLab.jsx
   (2.MD.D.9 · measure lengths, show them on a line plot).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-lineplot.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LinePlotLab.jsx', import.meta.url));
const src = readFileSync(PATH, 'utf8');

let pass = 0;
let fail = 0;
const bad = [];
function check(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    if (bad.length < 30) bad.push(msg);
  }
}

/* ---------------------------------------------------------------------------
   1. SLICE AND EVAL the shipped model.
   ------------------------------------------------------------------------- */
const importAt = src.indexOf("import { useCallback");
const compAt = src.indexOf('export default function LinePlotLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, WORM, GOLD, DIALS, TRAYS, START_N, CALIB_STEP, RULER_MAX, clampInt,
            plotCounts, multisetEq, longestOf, makeTray, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, TRAYS, START_N, CALIB_STEP, RULER_MAX, clampInt, plotCounts, multisetEq, longestOf,
  makeTray, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE RECORD MODEL — counts, multiset equality, one X per worm.
   ------------------------------------------------------------------------- */
check(JSON.stringify(plotCounts([3, 3, 4])) === JSON.stringify({ 3: 2, 4: 1 }), 'stacks count repeats');
check(multisetEq([3, 4, 3], [3, 3, 4]), 'the record is order-free');
check(!multisetEq([3, 4], [3, 4, 4]), 'an extra mark breaks the match');
check(!multisetEq([3, 4, 5], [3, 4, 6]), 'a wrong mark breaks the match');
check(!multisetEq([3, 3, 4], [3, 4, 4]), 'a shifted duplicate breaks the match (duplicate-exact)');
check(longestOf([4, 3, 5, 3, 6]) === 6, 'the longest worm is the farthest mark');

/* the deterministic lesson trays: every dial value deals lengths 2–8 of the
   right count, with a repeat — a stack must always be there to read */
for (let n = 4; n <= 8; n++) {
  const t = TRAYS[n];
  check(Array.isArray(t) && t.length === n, `tray ${n} deals ${n} worms`);
  t.forEach((v) => check(Number.isInteger(v) && v >= 2 && v <= RULER_MAX - 1, `tray ${n} lengths on the ruler`));
  check(new Set(t).size < t.length, `tray ${n} repeats a length (a stack exists)`);
  /* trays extend one another so the step-3 question's numbers survive the dial */
  check(t[0] === 4 && t[1] === 3 && t[3] === 3, `tray ${n} keeps the two 3-long worms of the copy`);
}
/* the step-4 trap is TRUE on every tray: the tallest stack (3) is not the
   longest worm */
for (let n = 4; n <= 8; n++) {
  const t = TRAYS[n];
  const counts = plotCounts(t);
  const tallest = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || a - b)[0];
  check(counts[3] >= 2 && counts[3] === Math.max(...Object.values(counts)), `tray ${n}: the tallest stack stands at 3`);
  check(longestOf(t) !== tallest, `tray ${n}: tallest stack ≠ longest worm (the trap is real)`);
}

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(DIALS.length === 1, 'K-tier: exactly one dial');
check(DIALS[0].min === 4 && DIALS[0].max === 8, 'the dial deals 4–8 worms');
check(TRAYS[START_N][0] === 4, 'the first measured worm reads 4 — as the step-1 copy says');
check(STEPS[4].lens === 'gone' && STEPS[4].measure === 0, 'the record step empties the tray and measures nothing');
check(/tallest stack/i.test(STEPS[3].q) && /longest/i.test(STEPS[3].q), 'the trap question is the axis confusion');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — measured-all AND multiset match; the meter caps at 99
   short of a true record; the generator always deals a repeat.
   ------------------------------------------------------------------------- */
for (let i = 0; i < 4000; i++) {
  const t = makeTray(null);
  check(t.length === 5, 'a crawl of five');
  t.forEach((v) => check(Number.isInteger(v) && v >= 2 && v <= 8, 'crawl lengths in range'));
  check(new Set(t).size < t.length, 'the crawl repeats a length');
}
{
  const t = makeTray(null);
  for (let i = 0; i < 100; i++) check(!multisetEq(makeTray(t), t), 'a new crawl is genuinely new');
}
{
  const lengths = [3, 5, 3, 7, 4];
  /* the true record stamps */
  check(isCalibrated(5, [3, 3, 4, 5, 7], lengths), 'a true record stamps (order-free)');
  check(closeness(5, [3, 3, 4, 5, 7], lengths) === 100, 'meter 100 on the true record');
  /* every single-mark corruption refuses */
  const truth = [3, 3, 4, 5, 7];
  for (let k = 0; k < truth.length; k++) {
    for (let wrong = 2; wrong <= 8; wrong++) {
      if (wrong === truth[k]) continue;
      const marks = truth.slice();
      marks[k] = wrong;
      check(!isCalibrated(5, marks, lengths), `one wrong mark refuses (${truth[k]}→${wrong})`);
      check(closeness(5, marks, lengths) < 100, 'meter under 100 with a wrong mark');
    }
  }
  check(!isCalibrated(5, truth.slice(0, 4), lengths), 'a missing mark refuses');
  check(!isCalibrated(5, [...truth, 4], lengths), 'an extra mark refuses');
  check(!isCalibrated(4, truth, lengths), 'unfinished measuring refuses even with perfect marks');
  check(closeness(3, [3, 3, 4], lengths) === 60, 'partial record meters as its matched fraction');
}
check(clampInt(11, 4, 8) === 8 && clampInt(1, 4, 8) === 4, 'dial clamps');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bmode\b|median|\bmeans?\b|balance|fulcrum|average|center of/i, 'no center statistics (DataLab)'],
  [/unit.?size|iterate|estimat/i, 'no measuring lesson (MeasurementLab)'],
  [/fair start|gold line|start line/i, 'no fairness protocol (LengthComparisonLab — the ruler bakes it in)'],
  [/bar graph|pictograph|\bpie\b|categor/i, 'no categorical displays (GraphsLab)'],
  [/\bdots?\b/i, 'marks are X’s, never dots (DataLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier: nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the X is drawn as two strokes — never an arc */
{
  const xDraw = code.slice(code.indexOf("/* the X's"), code.indexOf('capstone prompt'));
  check(xDraw.includes('lineTo') && !xDraw.includes('arc('), 'the mark is two strokes, not a dot');
}
/* one scale function serves both the ruler and the plot */
check((code.match(/const xOf = /g) || []).length === 1, 'ruler and plot share one scale');
/* one worm, one X: the lesson's measure handler adds exactly one mark */
check(/setMarks\(\(prev\) => \[\.\.\.prev, tray\[measured\]\]\); \/\/ one worm, one X/.test(code), 'the lesson drops exactly one mark per measurement');
/* the capstone owes a mark before the next measurement */
check(/if \(pending\) return; \/\/ the owed mark comes first/.test(code), 'no measuring ahead of an owed mark');
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons <= 2, `toolbar holds at most two buttons (found ${buttons})`);
}

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-lineplot: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
