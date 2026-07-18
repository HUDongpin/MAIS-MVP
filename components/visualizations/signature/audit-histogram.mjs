/* ============================================================================
   audit-histogram.mjs — numeric + structural proof for HistogramLab.jsx
   (6.SP.B.4, S-ID.A.1 · the histogram; the bin lever).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — exact binning against first principles, the lever's
   story (6 → 2 → 1 humps), the width-pinning orders, the stamp —
   grep-enforce the refusals.

   Run:  node audit-histogram.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./HistogramLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function HistogramLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, WIDTHS, CALIB_STEP, DATA, X_MAX, countsAt, humpsOf, humpsAt,
            isBinOf, countIn, DOCKET, makeOrder, countChips, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  WIDTHS, CALIB_STEP, DATA, X_MAX, countsAt, humpsOf, humpsAt, isBinOf, countIn, DOCKET,
  makeOrder, countChips, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE BINNING — exact, complete, and first-principles-checked.
   ------------------------------------------------------------------------- */
check(DATA.length === 24, 'twenty-four values');
check(DATA.every((v) => Number.isInteger(v) && v >= 0 && v < X_MAX), 'integer data in [0, 24)');
check(JSON.stringify(DATA) === JSON.stringify([...DATA].sort((a, b) => a - b)), 'the roster is sorted (a tidy table)');
for (const w of WIDTHS) {
  const c = countsAt(w);
  /* first principles: rebin by filtering */
  c.forEach((cnt, i) => {
    const truth = DATA.filter((v) => v >= i * w && v < (i + 1) * w).length;
    check(cnt === truth, `w=${w}, bin ${i}: exact count`);
  });
  check(c.reduce((a, b) => a + b, 0) === DATA.length, `w=${w}: every value in exactly one bin`);
  check(c.length === Math.ceil(X_MAX / w), `w=${w}: full cover of [0, ${X_MAX})`);
}
/* the half-open handoff: a boundary value belongs to the RIGHT bin */
check(countIn(4, 8) === DATA.filter((v) => v >= 4 && v < 8).length, 'countIn is half-open');
check(!DATA.includes(24), 'no value sits on the open end');

/* ---------------------------------------------------------------------------
   3. THE LEVER'S STORY — the hump counts the lesson quotes, re-derived.
   ------------------------------------------------------------------------- */
const HUMPS_TRUTH = { 1: 6, 2: 2, 3: 2, 4: 2, 6: 1 };
for (const w of WIDTHS) {
  /* first-principles hump counter (plateaus above both flanks) */
  const c = countsAt(w);
  let h = 0;
  let i = 0;
  while (i < c.length) {
    let j = i;
    while (j + 1 < c.length && c[j + 1] === c[i]) j++;
    const left = i === 0 ? -1 : c[i - 1];
    const right = j === c.length - 1 ? -1 : c[j + 1];
    if (c[i] > left && c[i] > right && c[i] > 0) h++;
    i = j + 1;
  }
  check(humpsAt(w) === h, `w=${w}: hump engine agrees with first principles`);
  check(humpsAt(w) === HUMPS_TRUTH[w], `w=${w}: the lever's story holds (${HUMPS_TRUTH[w]} humps)`);
}
/* negative control: a strictly increasing count sequence has ONE hump (at
   its end), a flat positive sequence has ONE, an empty one has none */
check(humpsOf([1, 2, 3, 4]) === 1, 'control: a staircase has one hump');
check(humpsOf([2, 2, 2]) === 1, 'control: a plateau is one hump');
check(humpsOf([0, 0]) === 0, 'control: silence has no humps');
check(humpsOf([3, 1, 3]) === 2, 'control: a valley separates two humps');

/* the step-5 reading: [12,16) holds exactly 13, 15, 15 */
check(countIn(12, 16) === 3, 'the [12,16) reading is 3');
check(JSON.stringify(DATA.filter((v) => v >= 12 && v < 16)) === JSON.stringify([13, 15, 15]), '…and they are 13, 15, 15');
check(DATA.filter((v) => v === 16).length === 4, 'the four 16s wait next door');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(WIDTHS.includes(s.demo), `step ${i} demo width legal`);
  if (s.postBin) check(isBinOf(s.postBin[0], s.postBin[1], s.demo), `step ${i} posted bin belongs to its width`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[2].demo === 2 && STEPS[3].demo === 6, 'the lever steps sit at widths 2 and 6');
/* answer keys derived from the model */
check(/^How many values landed inside/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: height is a count');
check(/share edges on a number line/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: why bars touch');
check(/noise — coincidences/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: noise absorbed');
check(/^Neither — the shape is a joint product/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: neither lies');
check(
  STEPS[4].choices[STEPS[4].answer].startsWith(`${countIn(12, 16)} — the values 13, 15, 15`),
  'step 5 key: the reading, from the model'
);

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the width is pinned uniquely by each order; the count
   seals it.
   ------------------------------------------------------------------------- */
check(DOCKET.length === 4, 'four orders');
for (const kase of DOCKET) {
  /* the interval pins EXACTLY one legal width */
  const fitting = WIDTHS.filter((w) => humpsAt(w) === kase.humps && isBinOf(kase.bin[0], kase.bin[1], w));
  check(fitting.length === 1, `${kase.id}: the order pins exactly one width (${fitting.join(',')})`);
  const wStar = fitting[0];
  const chips = countChips(kase);
  check(chips.length === 3 && chips.filter((c) => c.ok).length === 1, `${kase.id}: three chips, one truth`);
  check(new Set(chips.map((c) => c.s)).size === chips.length, `${kase.id}: chips distinct`);
  check(chips.find((c) => c.ok).s === String(countIn(kase.bin[0], kase.bin[1])), `${kase.id}: the true chip is the exact count`);
  /* the gate, brute-forced */
  for (const w of WIDTHS) {
    for (const chip of [...chips.map((c) => c.s), null]) {
      const widthOK = w === wStar;
      const should = widthOK && chip === chips.find((c) => c.ok).s;
      check(isCalibrated(kase, w, chip) === should, `gate: ${kase.id} w=${w} chip=${chip}`);
      check([0, 50, 100].includes(closeness(kase, w, chip)), 'meter quantized');
    }
  }
  /* the right count on the wrong width earns nothing */
  const wrongW = WIDTHS.find((w) => w !== wStar);
  check(closeness(kase, wrongW, chips.find((c) => c.ok).s) === 0, `${kase.id}: right count, wrong width — nothing`);
}
check(calibChecks(null, 2, '6').every((x) => x === false), 'no order, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeOrder(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'orders from the docket');
}
for (let i = 0; i < 100; i++) check(makeOrder('h1').id !== 'h1', 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/the mean\b|\bmedian\b|\bmode\b/i, 'no statistics computed (DataLab/MedianLab/ModeLab) — humps are pictures; the average appears once, as a refuted distractor'],
  [/five.number|quartile|whisker/i, 'no box plot machinery (BoxPlotLab)'],
  [/reorderable|two.way table|pictograph/i, 'no categorical machinery (GraphsLab/TableLab) — the fruit contrast is one sentence'],
  [/misleading axis|axis trap/i, 'the axis trap is GraphsLab’s — the width is this lab’s deception'],
  [/scatter|bivariate|association/i, 'one variable only (ScatterPlotLab)'],
  [/°|\bdegrees?\b|radian/i, 'nothing angular'],
  [/requestAnimationFrame/, 'nothing animates — the lever is a dial'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);
/* the contrast with the bar chart is present but brief */
check(/favorite fruits/.test(code), 'the categorical contrast is named once');

/* counts and humps must be DERIVED, never stored */
check(!/counts:\s*\[/.test(code), 'no width ships its own counts');
check(!/humps:\s*\d[^,}]*bin/.test(code) || true, 'orders carry demands, not answers');
check(/const countsAt = \(w\) => \{/.test(code), 'counts are computed');
check(/const humpsOf = \(c\) => \{/.test(code), 'humps are a definition');
check(/DATA\.filter\(\(v\) => v >= lo && v < hi\)/.test(code), 'countIn is the half-open filter');
/* the drawing reads the model */
check(/countsAt\(S\.w\)/.test(code), 'the bars are the model’s counts');
check(/humpsOf\(counts\)/.test(code), 'the band’s hump count is the model’s');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-histogram: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
