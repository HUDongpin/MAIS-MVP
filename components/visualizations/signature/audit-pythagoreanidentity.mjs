/* ============================================================================
   audit-pythagoreanidentity.mjs — numeric proof for PythagoreanIdentityLab.jsx
   (HSF-TF.C.8 · the budget of 1; size from the budget, sign from the quadrant).

   Run:  node audit-pythagoreanidentity.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PythagoreanIdentityLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PythagoreanIdentityLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, gcdOf, reduceF, sqF, oneMinusF,
            addF, eqF, fracText, fmtInt, sqrtInt, QUAD_SIGNS, cos2FromSin,
            cosFromSin, CORNERS, CASES, SQ_CHIPS, COS_CHIPS, labelOf, sqTruth,
            cosTruth, makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, gcdOf, reduceF, sqF, oneMinusF, addF, eqF, fracText, sqrtInt,
  QUAD_SIGNS, cos2FromSin, cosFromSin, CORNERS, CASES, SQ_CHIPS, COS_CHIPS, labelOf,
  sqTruth, cosTruth, makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. FRACTION ENGINE — against brute integer arithmetic.
   ------------------------------------------------------------------------- */
check(gcdOf(12, 8) === 4 && gcdOf(7, 13) === 1 && gcdOf(0, 5) === 5, 'gcd behaves');
check(reduceF([50, 100]).join('/') === '1/2' && reduceF([-6, 8]).join('/') === '-3/4', 'reduction is exact');
check(eqF([2, 4], [1, 2]) && !eqF([1, 3], [1, 2]), 'fraction equality via reduction');
check(addF([1, 3], [1, 6]).join('/') === '1/2', 'addition reduces');
check(fracText([3, 5]) === '3/5' && fracText([-4, 5]) === `${MINUS}4/5` && fracText([1, 1]) === '1', 'printing');

/* every corner is a genuine primitive-triple point: a² + b² = c², gcd 1 */
for (const key of Object.keys(CORNERS)) {
  const { cos: [a, c1], sin: [b, c2] } = CORNERS[key];
  check(c1 === c2, `${key}: shared hypotenuse`);
  check(a * a + b * b === c1 * c1, `${key}: a² + b² = c² by integers`);
  check(gcdOf(a, b) === 1 || gcdOf(gcdOf(a, b), c1) === 1, `${key}: primitive`);
  /* THE BUDGET: cos² + sin² = 1, in exact fractions */
  check(eqF(addF(sqF(CORNERS[key].cos), sqF(CORNERS[key].sin)), [1, 1]), `${key}: the budget balances exactly`);
}
/* the budget balances in all four quadrants — signs die under squaring */
for (const key of Object.keys(CORNERS))
  for (const q of [1, 2, 3, 4]) {
    const [sc, ss] = QUAD_SIGNS[q];
    const c = [sc * CORNERS[key].cos[0], CORNERS[key].cos[1]];
    const s = [ss * CORNERS[key].sin[0], CORNERS[key].sin[1]];
    check(eqF(addF(sqF(c), sqF(s)), [1, 1]), `${key} in Q${q}: budget still 1`);
  }
/* the sign table is the geometry: cos +right/−left, sin +up/−down */
check(QUAD_SIGNS[1].join() === '1,1' && QUAD_SIGNS[2].join() === '-1,1' && QUAD_SIGNS[3].join() === '-1,-1' && QUAD_SIGNS[4].join() === '1,-1', 'the four rooms');

/* recovery: cosFromSin returns the exact share whose square completes the budget */
for (const { sin, quad } of CASES) {
  const c = cosFromSin(sin, quad);
  check(eqF(addF(sqF(c), sqF(sin)), [1, 1]), `recovered cos completes the budget (${fracText(sin)}, Q${quad})`);
  check(Math.sign(c[0]) === QUAD_SIGNS[quad][0], `recovered cos wears the quadrant's sign (Q${quad})`);
  check(Math.sign(sin[0]) === QUAD_SIGNS[quad][1], `the posted sine matches its quadrant (Q${quad})`);
  check(eqF(cos2FromSin(sin), sqF(c)), 'cos² is consistent with cos');
}
/* a sine contradicting its quadrant must THROW */
{
  let threw = false;
  try {
    cosFromSin([3, 5], 3);
  } catch {
    threw = true;
  }
  check(threw, 'a positive sine refuses quadrant III');
}
/* a non-triple sine must THROW rather than float */
{
  let threw = false;
  try {
    cosFromSin([1, 3], 1);
  } catch {
    threw = true;
  }
  check(threw, 'a non-triple share refuses to float');
}
/* the failed identity in step 3's note: sin + cos ≠ 1 at the 3-4-5 corner */
check(3 * 5 + 4 * 5 !== 25 && 3 + 4 !== 5, 'the unsquared sum fails, as quoted (7/5 ≠ 1)');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/16\/25 \+ 9\/25 = 25\/25/.test(STEPS[0].feedback), 'step 1 runs the fractions');
check(16 + 9 === 25, 'and they total');
check(/144\/169 \+ 25\/169 = 169\/169/.test(STEPS[1].feedback), 'step 2 runs the 5-12-13 budget');
check(144 + 25 === 169, 'and it totals');
check(/3\/5 \+ 4\/5 = 7\/5/.test(STEPS[2].note), 'step 3 note shows the unsquared failure');
check(/1 −\s*25\/169 = 144\/169/.test(STEPS[3].body.replace(/\s+/g, ' ')), 'step 4 spends the budget');
check(/rearrangement bench/.test(STEPS[0].q), 'the theorem is credited');
check(/triangle bench/.test(STEPS[2].body), 'the names are credited');
check(/radical bench|one-way/.test(STEPS[3].note), 'the sign-amnesia cousin is cited');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!CORNERS[s.corner], `step ${i} corner exists`);
  check([1, 2, 3, 4].includes(s.quad), `step ${i} quadrant valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].corner === 'c345' && STEPS[1].corner === 'c51213' && STEPS[3].quad === 2 && !!STEPS[4].dial, 'the corner ladder; the dial on step 5');
/* answer keys */
check(/^\(4\/5\)² \+ \(3\/5\)² = 1²/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the fractional theorem');
check(/^The hypotenuse is always the radius/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: why always');
check(/^sin²θ \+ cos²θ = 1/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the renaming');
check(/^The quadrant — squaring erased the sign/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the missing bit');
check(/^I and II only/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the upper half');
check(/specially chosen to work/.test(STEPS[1].choices.join('|')), 'the rigged-numbers belief is offered');
check(/sin θ \+ cos θ = 1/.test(STEPS[2].choices.join('|')), 'the unsquared belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted shares');
const sqPosted = new Set(CASES.map((_, i) => sqTruth(i)));
const cosPosted = new Set(CASES.map((_, i) => cosTruth(i)));
check(SQ_CHIPS.every((s) => sqPosted.has(s)), 'every budget chip is some case’s truth');
check(COS_CHIPS.every((c) => cosPosted.has(c)), 'every cosine chip is some case’s truth');
/* the engineered near-miss: same budget, opposite signs */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && sqTruth(i) === sqTruth(j) && cosTruth(i) !== cosTruth(j))),
  'two cases share a budget but not a signed cosine'
);
for (let i = 0; i < CASES.length; i++) {
  const sT = sqTruth(i);
  const cT = cosTruth(i);
  check(SQ_CHIPS.includes(sT) && COS_CHIPS.includes(cT), `case ${i}: truths are chips`);
  /* first principles: cos² = (d² − n²)/d², by integers */
  const [n, d] = CASES[i].sin;
  const g = gcdOf(d * d - n * n, d * d);
  check(sT === `${(d * d - n * n) / g}/${(d * d) / g}`, `case ${i}: budget from integers`);
  for (const sp of [null, ...SQ_CHIPS, 'bogus']) {
    for (const cp of [null, ...COS_CHIPS]) {
      const should = sp === sT && cp === cT;
      check(isCalibrated(i, sp, cp) === should, `gate: case ${i} s=${sp} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, sp, cp)), 'meter quantized');
    }
  }
  const wrongS = SQ_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, cT) === 0, `case ${i}: the sign without the budget earns nothing`);
  check(labelOf(i).includes(fracText(CASES[i].sin)), `case ${i}: label posts the sine`);
}
check(calibChecks(null, '16/25', '4/5').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/corner fan|ratio ledger|steepness ladder|opp\/hyp|\bSOH\b/i, 'no quotient machinery (TrigRatioLab)'],
  [/rearrangement proof|four copies|\bshear/i, 'the proof stays on the rearrangement bench'],
  [/\bwaves?\b|\bperiod\b|amplitude|unwrap/i, 'no circular-function graphs'],
  [/turning point/i, 'the turning story stays on the unit-circle bench'],
  [/inscribed|\bchords?\b|\barcs?\b(?!\()/i, 'no circle theorems (CircleTheoremsLab; ctx.arc is the canvas API, not vocabulary)'],
  [/one-way gate|checkpoint|intruder/i, 'no gate machinery (ExtraneousLab; the cousin is cited by bench)'],
  [/gap gauge|narrowest station/i, 'no gauge machinery (LineParabolaLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|cos|tan|atan|acos|asin)/, 'no float trig, no float roots'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* no decimal a student sees */
{
  const prose = codeSansCss.replace(/rgba\([^)]*\)/g, '').replace(/\+ 0\.5\b/g, '');
  check(!/\b0\.\d/.test(prose), 'REFUSAL violated: no decimal shares — fractions only');
}

/* verdicts must be DERIVED, never stored */
check(/const cosFromSin = \(sin, quad\) => \{/.test(code), 'the recovery is computed live');
check(/const cos2FromSin = \(sin\) => \{/.test(code), 'the budget is spent live');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/cos:|budget|truth|answer/i.test(block), 'no case ships its own recovery');
}
/* the drawing reads the model */
check(/S\.cos2\[0\] \/ S\.cos2\[1\]/.test(code), 'the bar split reads the model');
check(/fracText\(S\.cos2\)/.test(code) && /fracText\(S\.sin2\)/.test(code), 'the block labels read the model');
check(/S\.cos2\[0\] \+ S\.sin2\[0\]/.test(code), 'the total is summed from the model, not typed');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-pythagoreanidentity: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
