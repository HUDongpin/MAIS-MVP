/* ============================================================================
   audit-covariation.mjs — numeric + structural proof for CovariationLab.jsx
   (6.EE.C.9 · dependent & independent variables; three synced windows).

   Run:  node audit-covariation.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CovariationLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CovariationLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PROBE_MAX, CALIB_STEP, STORIES, valueAt, rowsOf,
            subLine, CASES, makeCase, driverTruth, driverChips, valueTruth, valueChips,
            calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  PROBE_MAX, CALIB_STEP, STORIES, valueAt, rowsOf, subLine, CASES, makeCase, driverTruth,
  driverChips, valueTruth, valueChips, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE RULES — integer, and the three windows agree by construction.
   ------------------------------------------------------------------------- */
for (const [id, s] of Object.entries(STORIES)) {
  check(Number.isInteger(s.a) && Number.isInteger(s.b) && s.a !== 0, `${id}: an honest integer rule`);
  const rows = rowsOf(s);
  check(rows.length === PROBE_MAX + 1, `${id}: a full ledger`);
  for (const [x, y] of rows) {
    check(y === s.a * x + s.b, `${id} x=${x}: the row is the rule`);
    check(subLine(s, x).endsWith(`= ${y}`), `${id} x=${x}: the substitution lands on the row`);
  }
  check(valueAt(s, 0) === s.b, `${id}: the starting value is b`);
  /* none of the stories is proportional — the R1 refusal, enforced in data */
  check(s.b !== 0, `${id}: carries a starting value (not ProportionalLab territory)`);
}
/* the candle and the tank: falling passengers, strictly */
for (const id of ['candle', 'tank']) {
  const s = STORIES[id];
  check(s.a < 0, `${id}: the passenger falls`);
  const rows = rowsOf(s);
  for (let k = 0; k + 1 < rows.length; k++) check(rows[k + 1][1] < rows[k][1], `${id}: strictly falling row ${k}`);
  check(rows[rows.length - 1][1] > 0, `${id}: never burns past zero on the ledger`);
}
/* the plant and the jar: rising passengers */
for (const id of ['plant', 'jar']) {
  const rows = rowsOf(STORIES[id]);
  for (let k = 0; k + 1 < rows.length; k++) check(rows[k + 1][1] > rows[k][1], `${id}: strictly rising row ${k}`);
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(valueAt(STORIES.plant, 4) === 11, 'week 4: 11 cm');
check(valueAt(STORIES.plant, 2) === 7, 'week 2: the (2, 7) fact');
check(valueAt(STORIES.plant, 0) === 3, 'week 0: the starting 3');
check(2 * 4 === 8, 'the forgot-the-start foil: 8');
check(STORIES.candle.b === 20 && STORIES.candle.a === -2, 'the candle: 20 minus 2 per hour');
check(/2·4 \+ 3 = 11/.test(STEPS[1].choices[0]), 'step 2 quotes the substitution');
check(/\(2, 7\)/.test(STEPS[2].q), 'step 3 posts the point');
check(/h = 2w \+ 3/.test(STEPS[3].body), 'step 4 posts the rule');
check(/L = 20 − 2h/.test(STEPS[4].body), 'step 5 posts the candle');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!STORIES[s.story], `step ${i} story exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].windows && !!STEPS[1].windows, 'the windows open at step 2');
check(STEPS[4].story === 'candle', 'the falling passenger arrives at step 5');
/* answer keys derived from the model */
check(/^The weeks — time drives itself/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the driver');
check(/^11 cm — the row \(4, 11\)/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the row');
check(/^At week 2 the plant is 7 cm/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: one fact');
check(/^The height at week 0/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the launch value');
check(/^The length — it falls as the hours rise/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the falling passenger');
/* the real beliefs are offered and refuted */
check(/it is the one we care about/.test(STEPS[0].choices.join('|')), 'the importance belief is offered');
check(/8 cm — two centimeters for each/.test(STEPS[1].choices.join('|')), 'the forgot-the-start belief is offered');
check(/one rises and one falls, so they are unrelated/.test(STEPS[4].choices.join('|')), 'the unrelated belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted stories');
check(CASES.some((c) => STORIES[c.id].a < 0) && CASES.some((c) => STORIES[c.id].a > 0), 'both directions posted');
for (let i = 0; i < CASES.length; i++) {
  const { id, probe } = CASES[i];
  const dChips = driverChips(i);
  const vChips = valueChips(i);
  const dT = driverTruth(i);
  const vT = valueTruth(i);
  check(dChips.length === 4 && new Set(dChips).size === 4, `case ${i}: four distinct driver chips`);
  check(vChips.length === 4 && new Set(vChips).size === 4, `case ${i}: four distinct value chips`);
  check(dChips.includes(dT), `case ${i}: the driver truth is on a chip`);
  check(vChips.includes(vT), `case ${i}: the value truth is on a chip`);
  check(dT === STORIES[id].indep, `case ${i}: the driver is the independent variable`);
  check(Number(vT) === STORIES[id].a * probe + STORIES[id].b, `case ${i}: value truth from first principles`);
  for (const dp of [null, ...dChips, 'bogus']) {
    for (const vp of [null, ...vChips]) {
      const should = dp === dT && vp === vT;
      check(isCalibrated(i, dp, vp) === should, `gate: case ${i} d=${dp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, dp, vp)), 'meter quantized');
    }
  }
  const wrongD = dChips.find((x) => x !== dT);
  check(closeness(i, wrongD, vT) === 0, `case ${i}: the value without the driver earns nothing`);
}
check(calibChecks(null, 'weeks', '15').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(1) !== 1, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/fingerprint|origin test|y ÷ x/i, 'no proportionality devices (ProportionalLab)'],
  [/\bslope\b/i, 'the word slope never appears (LineFunctionLab)'],
  [/one-output|one output|vertical.line/i, 'no function-definition machinery (FunctionLab)'],
  [/silhouette/i, 'no formula-free silhouettes (GraphStoryLab)'],
  [/two-way/i, 'no categorical tables (TableLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const valueAt = \(story, x\) => story\.a \* x \+ story\.b/.test(code), 'the value is the rule');
check(/const rowsOf = \(story\) => \{/.test(code), 'the ledger is generated, not typed');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/value|answer|truth|driver:/i.test(block), 'no story ships its own answers');
}
/* the drawing reads the model */
check(/rowsOf\(S\.story\)/.test(code), 'the table window reads the model');
check(/subLine\(S\.story, S\.probe\)/.test(code), 'the equation window reads the model');
check(/driverChips\(kase\)/.test(code) && /valueChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-covariation: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
