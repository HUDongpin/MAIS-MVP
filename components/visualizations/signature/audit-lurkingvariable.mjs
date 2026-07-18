/* ============================================================================
   audit-lurkingvariable.mjs — numeric + structural proof for
   LurkingVariableLab.jsx (S-ID.C.9 · correlation ≠ causation; the third
   actor; the stratification test).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the exact pair tallies recounted from scratch (the
   classic dataset tallies +48 overall and exactly 0 within every band),
   all four study kinds represented, both stamp rulings derived, the
   gates exhausted — and grep-enforce the refusals.

   Run:  node audit-lurkingvariable.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LurkingVariableLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function LurkingVariableLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, sgn, tallyOf, tallyWithin, CONES, CASES,
            makeCase, ASSOC_CHIPS, CONTROL_CHIPS, assocTruth, controlTruth, calibChecks,
            closeness, isCalibrated, STEPS, BAND_LABELS };`
)();
const {
  CALIB_STEP, tallyOf, tallyWithin, CONES, CASES, makeCase, ASSOC_CHIPS, CONTROL_CHIPS,
  assocTruth, controlTruth, calibChecks, closeness, isCalibrated, STEPS, BAND_LABELS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE AUDIT'S OWN pair tally — recounted from scratch.
   ------------------------------------------------------------------------- */
const mySgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const myTally = (pts) => {
  let net = 0;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      net += mySgn(pts[j][0] - pts[i][0]) * mySgn(pts[j][1] - pts[i][1]);
  return net;
};
const myWithin = (pts) => {
  let net = 0;
  for (let b = 0; b <= 2; b++) net += myTally(pts.filter((p) => p[2] === b));
  return net;
};

/* the classic: +48 overall, exactly 0 within every band */
check(myTally(CONES) === 48, 'the cones cloud tallies +48 overall');
check(myWithin(CONES) === 0, 'the cones cloud tallies exactly 0 within the bands');
for (let b = 0; b <= 2; b++)
  check(myTally(CONES.filter((p) => p[2] === b)) === 0, `band ${b}: the within-band tally is exactly zero`);
check(tallyOf(CONES) === myTally(CONES), 'the model’s tally agrees with the recount');
check(tallyWithin(CONES) === myWithin(CONES), 'the model’s within-tally agrees with the recount');

/* the four posted kinds */
const EXPECT = [
  { all: 48, within: 0, assoc: 0, control: 0 } /* positive, vanishes */,
  { all: -48, within: 0, assoc: 1, control: 0 } /* negative, vanishes */,
  { all: 66, within: 18, assoc: 0, control: 1 } /* positive, survives */,
  { all: 0, within: 0, assoc: 2, control: 2 } /* none, nothing to explain */,
];
for (let i = 0; i < CASES.length; i++) {
  const pts = CASES[i].pts;
  check(pts.length === 12, `case ${i}: twelve points`);
  for (let b = 0; b <= 2; b++)
    check(pts.filter((p) => p[2] === b).length === 4, `case ${i}: band ${b} holds four points`);
  check(pts.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1])), `case ${i}: integer data`);
  check(myTally(pts) === EXPECT[i].all, `case ${i}: overall tally is ${EXPECT[i].all}`);
  check(myWithin(pts) === EXPECT[i].within, `case ${i}: within-band tally is ${EXPECT[i].within}`);
  check(assocTruth(i) === ASSOC_CHIPS[EXPECT[i].assoc], `case ${i}: the pattern ruling is derived`);
  check(controlTruth(i) === CONTROL_CHIPS[EXPECT[i].control], `case ${i}: the control ruling is derived`);
}
/* all three chips of each ruling are some case's truth */
for (const chip of ASSOC_CHIPS)
  check(CASES.some((_, i) => assocTruth(i) === chip), `pattern chip lives: ${chip}`);
for (const chip of CONTROL_CHIPS)
  check(CASES.some((_, i) => controlTruth(i) === chip), `control chip lives: ${chip}`);
check(CASES[0].pts === CONES, 'the classic is the first posted study');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
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
check(!STEPS[0].colorOn && !STEPS[1].colorOn, 'the cloud opens uncolored');
check(!!STEPS[2].colorOn, 'the coloring arrives at step 3');
check(!!STEPS[3].bandChips, 'the stratifying chips arrive at step 4');
check(BAND_LABELS.length === 3, 'three bands named');
/* answer keys derived from the model */
check(/^Yes — the association is genuinely in the data/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the pattern is real');
check(/^Nothing — association is symmetric/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: no arrows in clouds');
check(/^Summer drives both/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the third actor');
check(/^Nothing — hold the season fixed/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the collapse');
check(/^A randomized experiment/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: what earns an arrow');
/* the real beliefs are offered and refuted */
check(/that is what axes are for/.test(STEPS[1].choices.join('|')), 'the axes-assign-blame belief is offered');
check(/bigger observational dataset/.test(STEPS[4].choices.join('|')), 'the more-data belief is offered');
/* the vocabulary and the citations */
check(/LURKING\s*VARIABLE/i.test(STEPS[2].feedback), 'the standard’s term is named');
check(/sampling bench/.test(STEPS[4].feedback), 'the fair dip is cited for random assignment');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — both rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
for (let i = 0; i < CASES.length; i++) {
  const aT = assocTruth(i);
  const cT = controlTruth(i);
  check(ASSOC_CHIPS.includes(aT) && CONTROL_CHIPS.includes(cT), `case ${i}: truths are chips`);
  for (const ap of [null, ...ASSOC_CHIPS, 'bogus']) {
    for (const cp of [null, ...CONTROL_CHIPS]) {
      const should = ap === aT && cp === cT;
      check(isCalibrated(i, ap, cp) === should, `gate: case ${i} a=${ap} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, ap, cp)), 'meter quantized');
    }
  }
  const wrongA = ASSOC_CHIPS.find((x) => x !== aT);
  check(closeness(i, wrongA, cT) === 0, `case ${i}: the control without the pattern earns nothing`);
}
check(calibChecks(null, ASSOC_CHIPS[0], CONTROL_CHIPS[0]).every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(1) !== 1, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\brugs?\b|outlier|\btrend\b/i, 'no rugs, no trend theorems (ScatterPlotLab)'],
  [/residual|best fit|least squares/i, 'no fitted line (BestFitLab)'],
  [/coefficient/i, 'no r — that lab is unbuilt (H24)'],
  [/\bmean\b|\baverage\b/i, 'no statistics of center (MeanLab)'],
  [/spinner|long.run/i, 'no spinner (ProbabilityLab)'],
  [/histogram|\bbins?\b/i, 'no bins (HistogramLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)'],
  [/\bmarch/i, 'no arrow marches (SignedAdditionLab)'],
  [/Math\.sqrt/, 'no float statistic is ever computed'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const assocTruth = \(i\) => \{/.test(code), 'the pattern ruling is a sign, not a string in the case');
check(/const controlTruth = \(i\) => \{/.test(code), 'the control ruling is derived from the tallies');
check(/const tallyOf = \(pts\) => \{/.test(code), 'the tally is a real pair count');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/truth|assoc|verdict|control:/i.test(block), 'no study ships its own verdicts');
}
/* the drawing reads the model */
check(/S\.dataset\.pts/.test(code), 'the cloud reads the model');
check(/CASES\[kase\]/.test(code), 'the posted study reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-lurkingvariable: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
