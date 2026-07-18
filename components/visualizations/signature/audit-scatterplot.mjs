/* ============================================================================
   audit-scatterplot.mjs — numeric + structural proof for ScatterPlotLab.jsx
   (8.SP.A.1 · scatter plots; the pairing is the picture).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — trend signs by integer covariance, the exactly-zero
   engineered sets, the blind-rugs permutation, the parabola, the outlier
   theorem, the stamp — grep-enforce the refusals.

   Run:  node audit-scatterplot.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ScatterPlotLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ScatterPlotLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, trendNum, quadraticThrough, assocOf, nnSq,
            outliersOf, DATA, DOCKET, makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, trendNum, quadraticThrough, assocOf, nnSq, outliersOf, DATA, DOCKET, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* first-principles twins */
const trendTruth = (pts) => {
  const n = pts.length;
  const sx = pts.reduce((a, [x]) => a + x, 0);
  const sy = pts.reduce((a, [, y]) => a + y, 0);
  const sxy = pts.reduce((a, [x, y]) => a + x * y, 0);
  return n * sxy - sx * sy;
};
const multiset = (arr) => arr.slice().sort((a, b) => a - b).join(',');

/* ---------------------------------------------------------------------------
   2. THE DATASETS — integer, in window, and each playing its exact part.
   ------------------------------------------------------------------------- */
const allSets = [...Object.entries(DATA).map(([k, v]) => [k, v.pts]), ...DOCKET.map((c) => [c.id, c.pts])];
for (const [name, pts] of allSets) {
  for (const [x, y] of pts) {
    check(Number.isInteger(x) && Number.isInteger(y), `${name}: integer pairs`);
    check(x >= 0 && x <= 12 && y >= 0 && y <= 12, `${name}: pairs in the 0–12 window`);
  }
  check(trendNum(pts) === trendTruth(pts), `${name}: the trend engine agrees with first principles`);
}
/* the lesson's five verdicts, derived */
check(assocOf(DATA.study.pts) === 'positive' && trendNum(DATA.study.pts) > 0, 'study: positive');
check(assocOf(DATA.screens.pts) === 'negative' && trendNum(DATA.screens.pts) < 0, 'screens: negative');
check(trendNum(DATA.shoes.pts) === 0, 'shoes: the trend is EXACTLY zero, by construction');
check(assocOf(DATA.shoes.pts) === 'none', 'shoes: verdict none');
check(trendNum(DATA.bounce.pts) === 0, 'bounce: zero linear trend, exactly');
check(assocOf(DATA.bounce.pts) === 'nonlinear', 'bounce: and yet a perfect arch — nonlinear');
{
  const q = quadraticThrough(DATA.bounce.pts);
  check(q && q.aNum !== 0, 'bounce: a genuine quadratic passes through every dot');
  for (const [x, y] of DATA.bounce.pts) check(4 * y === (x - 6) * (x - 6), 'bounce: y = (x−6)²/4 exactly');
}
/* THE BLIND RUGS: shuffled is a true permutation of study, with zero trend */
check(multiset(DATA.study.pts.map(([x]) => x)) === multiset(DATA.shuffled.pts.map(([x]) => x)), 'shuffle: x-rug identical');
check(multiset(DATA.study.pts.map(([, y]) => y)) === multiset(DATA.shuffled.pts.map(([, y]) => y)), 'shuffle: y-rug identical');
check(trendNum(DATA.shuffled.pts) === 0, 'shuffle: the pattern is dead — trend EXACTLY zero');
check(assocOf(DATA.shuffled.pts) === 'none', 'shuffle: verdict none');
check(trendNum(DATA.study.pts) > 0, 'study: the pattern was alive before the shuffle');

/* ---------------------------------------------------------------------------
   3. THE OUTLIER THEOREM — exact, and it fires exactly where designed.
   ------------------------------------------------------------------------- */
for (const [name, pts] of allSets) {
  /* the rule re-derived from first principles */
  const nn = pts.map((_, i) => nnSq(pts, i));
  const expected = pts
    .map((_, i) => i)
    .filter((i) => nn[i] > 4 * Math.max(...nn.filter((_, j) => j !== i)));
  check(outliersOf(pts).join(',') === expected.join(','), `${name}: outlier rule agrees with first principles`);
}
check(outliersOf(DATA.teams.pts).length === 1, 'teams: exactly one visitor');
check(DATA.teams.pts[outliersOf(DATA.teams.pts)[0]].join(',') === '3,11', 'teams: the visitor is (3,11)');
for (const key of ['study', 'shuffled', 'screens', 'shoes', 'bounce']) {
  check(outliersOf(DATA[key].pts).length === 0, `${key}: no accidental outlier`);
}
/* docket outlier design: c1 and c5 have exactly one; c2, c3, c4 none */
check(outliersOf(DOCKET[0].pts).length === 1 && DOCKET[0].pts[outliersOf(DOCKET[0].pts)[0]].join(',') === '11,1', 'c1: the outlier is (11,1)');
check(outliersOf(DOCKET[4].pts).length === 1 && DOCKET[4].pts[outliersOf(DOCKET[4].pts)[0]].join(',') === '2,11', 'c5: the outlier is (2,11)');
for (const i of [1, 2, 3]) check(outliersOf(DOCKET[i].pts).length === 0, `${DOCKET[i].id}: no outlier`);
/* docket association design */
check(assocOf(DOCKET[0].pts) === 'positive', 'c1: positive despite its visitor');
check(assocOf(DOCKET[1].pts) === 'negative', 'c2: negative');
check(trendNum(DOCKET[2].pts) === 0 && assocOf(DOCKET[2].pts) === 'none', 'c3: exactly zero, none');
check(trendNum(DOCKET[3].pts) === 0 && assocOf(DOCKET[3].pts) === 'nonlinear', 'c4: zero trend, a downward arch');
check(assocOf(DOCKET[4].pts) === 'positive', 'c5: positive');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!DATA[s.data], `step ${i} dataset exists`);
  if (s.chips) s.chips.forEach((dk) => check(!!DATA[dk], `step ${i} chip ${dk} exists`));
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[1].data === 'shuffled' && STEPS[1].chips.join(',') === 'study,shuffled', 'the blind-rugs flip');
check(STEPS[4].chips.join(',') === 'shoes,bounce', 'none, then the hidden arch');
check(STEPS[5].data === 'teams', 'clusters and the visitor');
/* answer keys derived from the model */
check(/^One individual, showing both/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the dot is a pairing');
check(/^The pairing —/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: only the pairing died');
check(/TENDS to grow/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: a drift, not a law');
check(/^Negative —/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: negative');
check(/not .no pattern./.test(STEPS[4].choices[STEPS[4].answer].replace(/[“”"]/g, '.')), 'step 5 key: the arch behind zero');
check(/^Its distance from every other dot/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 key: distance, not size');
/* the causation trap is named, not taught (the correlation labs own it) */
check(/never the reason/.test(STEPS[3].feedback), 'the shows-riding-not-reason caveat is present');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — association AND outlier ruling; brute-forced gate.
   ------------------------------------------------------------------------- */
check(DOCKET.length === 5, 'five pages in the notebook');
for (const kase of DOCKET) {
  const truth = assocOf(kase.pts);
  const outs = outliersOf(kase.pts);
  const evidences = [null, 'none', ...kase.pts.map((_, i) => i)];
  for (const a of [null, 'positive', 'negative', 'none', 'nonlinear']) {
    for (const e of evidences) {
      const should =
        a === truth && (outs.length === 0 ? e === 'none' : e !== null && e !== 'none' && outs.includes(e));
      check(isCalibrated(kase, a, e) === should, `gate: ${kase.id} a=${a} e=${e}`);
      check([0, 50, 100].includes(closeness(kase, a, e)), 'meter quantized');
    }
  }
  /* right association + innocent dot: half credit, never a stamp */
  if (outs.length > 0) {
    const innocent = kase.pts.findIndex((_, i) => !outs.includes(i));
    check(closeness(kase, truth, innocent) === 50, `${kase.id}: innocent evidence earns only half`);
  }
}
check(calibChecks(null, 'positive', 'none').every((c) => c === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const drawn = makeCase(null);
  check(DOCKET.some((c) => c.id === drawn.id), 'pages from the notebook');
}
for (let i = 0; i < 100; i++) check(makeCase('c2').id !== 'c2', 'a new page is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   The fitted line is the NEXT lab's whole story; averages stay univariate.
   ------------------------------------------------------------------------- */
const forbid = [
  [/best fit|trend line|fitted line|least squares|residual/i, 'no fitted line (roadmap S3)'],
  [/\bslope\b|y\s*=\s*m/i, 'no slope (LineFunctionLab / S3)'],
  [/the mean\b|\bmedian\b|\bmode\b|x̄|ȳ/i, 'no averages computed (DataLab/MeanLab family)'],
  [/correlation coefficient|\br\s*=/i, 'no r (roadmap H24)'],
  [/\bcauses?\b|\bcausation\b/i, 'causation is the correlation labs’ story — not even named here'],
  [/two.way table|contingency/i, 'no categorical table (TableLab)'],
  [/\baddress\b|quadrant/i, 'no address language (PointLab)'],
  [/vertical.line test|one output/i, 'no function testing (FunctionLab)'],
  [/requestAnimationFrame/, 'nothing animates'],
  [/°|\bdegrees?\b|radian/i, 'nothing is measured in angle units'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(!/assoc:\s*'(positive|negative|none|nonlinear)'/.test(code), 'no dataset ships its own verdict');
check(!/outlier:\s*\d/.test(code), 'no dataset ships its own outlier');
check(/const trendNum = \(pts\) => \{/.test(code), 'the trend is computed from the pairs');
check(/n \* sxy - sx \* sy/.test(code), 'the trend is the integer covariance numerator');
check(/const outliersOf = \(pts\) =>/.test(code), 'the outlier is a computed theorem');
/* the drawing reads the same engines */
check(/assocOf\(pts\)/.test(code), 'the band’s verdict comes from the engine');
check(/outliersOf\(pts\)/.test(code), 'the drawing’s outlier comes from the engine');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-scatterplot: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
