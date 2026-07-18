/* ============================================================================
   audit-transversal.mjs — numeric + structural proof for TransversalLab.jsx
   (7.G.B.5, 8.G.A.5 · eight angles, two numbers; the copy and its death).

   Run:  node audit-transversal.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TransversalLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TransversalLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, POSITIONS, measureOf, allMeasures, relOf,
            REL_NAMES, CASES, makeCase, caseText, partnerTruth, partnerChips, relTruth,
            calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, POSITIONS, measureOf, allMeasures, relOf, REL_NAMES, CASES, makeCase,
  caseText, partnerTruth, partnerChips, relTruth, calibChecks, closeness, isCalibrated,
  STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE PAIR LAWS — over the whole dial space.
   ------------------------------------------------------------------------- */
const pairsOf = (rel) => {
  const out = [];
  for (let i = 0; i < POSITIONS.length; i++)
    for (let j = i + 1; j < POSITIONS.length; j++)
      if (relOf(POSITIONS[i], POSITIONS[j]) === rel) out.push([POSITIONS[i], POSITIONS[j]]);
  return out;
};
check(pairsOf('vertical').length === 4, 'four vertical pairs');
check(pairsOf('corresponding').length === 4, 'four corresponding pairs');
check(pairsOf('alternate interior').length === 2, 'two alternate-interior pairs');
check(pairsOf('co-interior').length === 2, 'two co-interior pairs');

for (let theta = 25; theta <= 155; theta += 5) {
  /* parallel: exactly two distinct values among eight */
  const parallel = allMeasures(theta, theta);
  check(new Set(parallel).size === (theta === 90 ? 1 : 2), `θ=${theta}: two numbers (one at 90°)`);
  check(parallel.every((m) => m === theta || m === 180 - theta), `θ=${theta}: every angle is θ or 180−θ`);
  for (const [p, q] of pairsOf('vertical'))
    check(measureOf(p, theta, theta) === measureOf(q, theta, theta), `θ=${theta}: vertical ${p}${q} equal`);
  for (const [p, q] of pairsOf('corresponding'))
    check(measureOf(p, theta, theta) === measureOf(q, theta, theta), `θ=${theta}: corresponding ${p}${q} equal`);
  for (const [p, q] of pairsOf('alternate interior'))
    check(measureOf(p, theta, theta) === measureOf(q, theta, theta), `θ=${theta}: alternate ${p}${q} equal`);
  for (const [p, q] of pairsOf('co-interior'))
    check(measureOf(p, theta, theta) + measureOf(q, theta, theta) === 180, `θ=${theta}: co-interior ${p}${q} supplementary`);
  /* tilted: four numbers; the vertical rules survive, the rest die */
  for (const tilt of [-20, 10, 25]) {
    const phi = theta + tilt;
    if (phi < 5 || phi > 175 || phi === 180 - theta) continue;
    const tilted = allMeasures(theta, phi);
    check(new Set(tilted).size === (theta === 90 || phi === 90 ? 3 : 4), `θ=${theta},φ=${phi}: the copy breaks`);
    for (const [p, q] of pairsOf('vertical'))
      check(measureOf(p, theta, phi) === measureOf(q, theta, phi), `θ=${theta},φ=${phi}: vertical survives`);
    for (const [p, q] of pairsOf('corresponding'))
      check(measureOf(p, theta, phi) !== measureOf(q, theta, phi), `θ=${theta},φ=${phi}: corresponding dies`);
    for (const [p, q] of pairsOf('alternate interior'))
      check(measureOf(p, theta, phi) !== measureOf(q, theta, phi), `θ=${theta},φ=${phi}: alternate dies`);
    for (const [p, q] of pairsOf('co-interior'))
      check(measureOf(p, theta, phi) + measureOf(q, theta, phi) !== 180, `θ=${theta},φ=${phi}: co-interior misses 180`);
  }
}

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(measureOf('A2', 65, 65) === 65 && measureOf('A1', 65, 65) === 115, 'the 65/115 pair');
check(180 - 115 === 65, 'the co-interior partner of 115 is 65');
for (const [p, q] of pairsOf('alternate interior'))
  check(measureOf(p, 65, 65) === measureOf(q, 65, 65), 'the Z at 65 reads equal');
check(/65° and 65°/.test(STEPS[2].choices[0]), 'step 3 quotes the equal Z');
check(/180 − 115 = 65/.test(STEPS[4].choices[0]), 'step 5 quotes the subtraction');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.theta) && Number.isInteger(s.tilt), `step ${i} scene valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!!STEPS[0].single && !STEPS[1].single, 'one crossing first, then the copy');
check(!!STEPS[2].family, 'the family chips arrive at step 3');
check(!!STEPS[3].tiltDial && STEPS[3].tilt !== 0, 'the sabotage arrives at step 4');
/* answer keys derived from the model */
check(/^Always equal — at ANY crossing/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: vertical is free');
check(/^Two — the parallel crossing is a perfect copy/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: two numbers');
check(/^65° and 65° — equal/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the Z');
check(/^Only the vertical equalities/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: what survives');
check(/^65° — co-interior pairs add to 180°/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the C');
/* the real beliefs are offered and refuted */
check(/Four — each crossing brings its own pair/.test(STEPS[1].choices.join('|')), 'the four-numbers belief is offered');
check(/Everything — angles are angles/.test(STEPS[3].choices.join('|')), 'the nothing-dies belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted crossings');
check(new Set(CASES.map((c) => relTruth(CASES.indexOf(c)))).size >= 3, 'several families are posted');
for (let i = 0; i < CASES.length; i++) {
  const { theta, pair } = CASES[i];
  check(relOf(pair[0], pair[1]) != null, `case ${i}: the pair belongs to a family`);
  const mChips = partnerChips(i);
  const mT = partnerTruth(i);
  const rT = relTruth(i);
  check(mChips.length === 4 && new Set(mChips).size === 4, `case ${i}: four distinct measure chips`);
  check(mChips.includes(mT), `case ${i}: the measure truth is on a chip`);
  check(REL_NAMES.includes(rT), `case ${i}: the family truth is a chip`);
  /* first principles */
  check(mT === `${measureOf(pair[1], theta, theta)}°`, `case ${i}: measure truth from first principles`);
  /* the family verdict is consistent with the measures */
  const m0 = measureOf(pair[0], theta, theta);
  const m1 = measureOf(pair[1], theta, theta);
  if (rT === 'co-interior') check(m0 + m1 === 180, `case ${i}: co-interior sums to 180`);
  else check(m0 === m1, `case ${i}: the equal families read equal`);
  for (const mp of [null, ...mChips, 'bogus']) {
    for (const rp of [null, ...REL_NAMES]) {
      const should = mp === mT && rp === rT;
      check(isCalibrated(i, mp, rp) === should, `gate: case ${i} m=${mp} r=${rp}`);
      check([0, 50, 100].includes(closeness(i, mp, rp)), 'meter quantized');
    }
  }
  const wrongM = mChips.find((x) => x !== mT);
  check(closeness(i, wrongM, rT) === 0, `case ${i}: the name without the measure earns nothing`);
}
check(calibChecks(null, '65°', 'vertical').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/protractor|\bturns?\b/i, 'no measuring vocabulary (AngleLab / AngleTurnLab)'],
  [/\btriangles?\b/i, 'no triangle — the corollary is ceded (TriangleLab)'],
  [/inscribed|central angle|\brim\b/i, 'no circle machinery (CircleTheoremsLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const measureOf = \(pos, theta, phi\) => \{/.test(code), 'the eight measures come from one function');
check(/const relOf = \(p, q\) => \{/.test(code), 'the families are position structure, not labels');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/measure|answer|truth|rel:/i.test(block), 'no case ships its own verdicts');
}
/* the drawing reads the model */
check(/measureOf\(pos, S\.theta, S\.phi\)/.test(code), 'the labels read the model');
check(/partnerChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-transversal: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
