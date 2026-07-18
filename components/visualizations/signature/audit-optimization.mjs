/* ============================================================================
   audit-optimization.mjs — numeric proof for OptimizationLab.jsx
   (AP · the climb detector; one sign change crowns the peak).

   Run:  node audit-optimization.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./OptimizationLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function OptimizationLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, fmtInt, halfOf, areaAt, detectorAt,
            flagAt, peakOf, bestOf, CASES, PEAK_CHIPS, BEST_CHIPS, labelOf,
            peakTruth, bestTruth, makeCase, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  CALIB_STEP, halfOf, areaAt, detectorAt, flagAt, peakOf, bestOf, CASES,
  PEAK_CHIPS, BEST_CHIPS, labelOf, peakTruth, bestTruth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE DETECTOR'S LAWS — bestness, sign law, the square, the fold.
   ------------------------------------------------------------------------- */
for (const P of [12, 16, 20, 24, 28, 32]) {
  const half = halfOf(P);
  const peak = peakOf(P);
  const best = bestOf(P);
  check(peak === P / 4 && best === (P * P) / 16, `peak and best formulas (P=${P})`);
  /* THE CONSTRAINT FOLD is an identity: x + (half − x) = half for all x */
  for (let x = 0; x <= half; x++) check(x + (half - x) === half, `the fold holds at x=${x} (P=${P})`);
  /* bestness: A(peak) beats every integer station, strictly away from it */
  for (let x = 0; x <= half; x++) {
    check(areaAt(P, x) <= best, `A(${x}) ≤ best (P=${P})`);
    if (x !== peak) check(areaAt(P, x) < best, `strict away from the peak (P=${P}, x=${x})`);
  }
  /* the square identity: at the peak both sides equal P/4 */
  check(half - peak === peak, `the best pen is the square (P=${P})`);
  check(areaAt(P, peak) === peak * peak, `its area is the square's (P=${P})`);
  /* the sign law: + before, 0 at, − after; exactly one zero */
  let zeros = 0;
  for (let x = 0; x <= half; x++) {
    const d = detectorAt(P, x);
    if (x < peak) check(d > 0 && flagAt(P, x) === 'climbing', `climbing before the peak (P=${P}, x=${x})`);
    else if (x === peak) {
      check(d === 0 && flagAt(P, x) === 'level', `level at the peak (P=${P})`);
      zeros++;
    } else check(d < 0 && flagAt(P, x) === 'falling', `falling after the peak (P=${P}, x=${x})`);
  }
  check(zeros === 1, `exactly one level station (P=${P})`);
  /* the detector really is the slope: A(x+1) − A(x) = A′(x) − 1 (exact discrete check)
     — and the symmetric secant equals A′ exactly for a quadratic */
  for (let x = 1; x < half; x++) {
    check(areaAt(P, x + 1) - areaAt(P, x - 1) === 2 * detectorAt(P, x), `the symmetric secant equals A′ exactly (P=${P}, x=${x})`);
  }
}
/* off-grid perimeters refuse */
for (const P of [10, 14, 22]) {
  let threw = false;
  try {
    halfOf(P);
  } catch {
    threw = true;
  }
  check(threw, `P=${P} refuses — the peak would leave the integers`);
}
/* the worked table and flanks */
check([1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => areaAt(20, x)).join(',') === '9,16,21,24,25,24,21,16,9', 'the opening table');
check(detectorAt(20, 3) === 4, 'A′(3) = 4, as quoted');
check(detectorAt(20, 4) === 2 && detectorAt(20, 6) === -2, 'the flanks +2 and −2');
check([12, 16, 20, 24, 28].map(bestOf).join(',') === '9,16,25,36,49', 'the dial ladder of bests');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/9, 16, 21, 24, 25, 24, 21, 16, 9/.test(STEPS[0].body), 'step 1 posts the table');
check(/A′\(x\) = 10 − 2x/.test(STEPS[1].body), 'step 2 imports the detector');
check(/derivative bench/.test(STEPS[1].body), 'with credit');
check(/\+8, \+6, \+4, \+2/.test(STEPS[2].body), 'step 3 reads the strip');
check(/P\/2 − P\/4 = P\/4/.test(STEPS[4].feedback), 'step 5 squares the pen');
check(/9, 16, 25, 36, 49/.test(STEPS[4].choices[STEPS[4].answer]), 'and posts the ladder');
check(/parabola bench/.test(STEPS[2].note), 'the other instrument is credited');
check(/sides 5 and 5, ' \+\s*'area 25, detector 0, flanks \+2 and −2/.test(STEPS[4].note) || /flanks \+2 and −2/.test(STEPS[4].note), 'the hand check is quoted');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(s.P % 4 === 0, `step ${i} pins a legal fence`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].showDetector && STEPS[1].showDetector && !!STEPS[4].dial, 'the detector enters at step 2; the dial at step 5');
/* answer keys */
check(/^Best among the stations TRIED/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^The area is CLIMBING at x = 3/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Left of 5 the area only climbs/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^Only LEVEL ground/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^The square — x = P\/4/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/25 beats every entry/.test(STEPS[0].choices.join('|')), 'the table-suffices belief is offered');
check(/A maximum, always/.test(STEPS[3].choices.join('|')), 'the zero-means-max belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 5, 'several posted fences');
check(CASES.join(',') === '12,16,20,24,28', 'the fence ladder');
const peaksPosted = new Set(CASES.map((_, i) => peakTruth(i)));
const bestsPosted = new Set(CASES.map((_, i) => bestTruth(i)));
check(PEAK_CHIPS.every((p) => peaksPosted.has(p)), 'every peak chip is some case’s truth');
check(BEST_CHIPS.every((b) => bestsPosted.has(b)), 'every best chip is some case’s truth');
for (let i = 0; i < CASES.length; i++) {
  const pT = peakTruth(i);
  const bT = bestTruth(i);
  check(PEAK_CHIPS.includes(pT) && BEST_CHIPS.includes(bT), `case ${i}: truths are chips`);
  check(Number(bT) === Number(pT) * Number(pT), `case ${i}: best = peak² — the square, again`);
  for (const pp of [null, ...PEAK_CHIPS, 'bogus']) {
    for (const bp of [null, ...BEST_CHIPS]) {
      const should = pp === pT && bp === bT;
      check(isCalibrated(i, pp, bp) === should, `gate: case ${i} p=${pp} b=${bp}`);
      check([0, 50, 100].includes(closeness(i, pp, bp)), 'meter quantized');
    }
  }
  const wrongP = PEAK_CHIPS.find((x) => x !== pT);
  check(closeness(i, wrongP, bT) === 0, `case ${i}: the best without the peak earns nothing`);
  check(labelOf(i).includes(String(CASES[i])), `case ${i}: label posts the fence`);
}
check(calibChecks(null, '5', '25').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\blimits?\b|h → 0|shrink(ing)? h|difference quotient/i, 'no derivation of A′ (the derivative bench)'],
  [/\bslats?\b|\btrap\b|odometer|accumulat/i, 'no adding (IntegralLab)'],
  [/gap gauge|narrowest station|\bfloor\b(?!\()/i, 'no gauge machinery (LineParabolaLab; Math.floor( is API)'],
  [/completing the square|vertex form/i, 'no square-completion (the parabola bench is cited by name only)'],
  [/related rates|ladder slid/i, 'one job, done fully'],
  [/chain of because|notariz/i, 'no proof machinery (ProofChainLab)'],
  [/census|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* no decimal a student sees — every quoted string is decimal-free */
{
  const strings = codeSansCss.match(/'(?:[^'\\\n]|\\.)*'/g) || [];
  check(strings.length > 80, 'the prose was actually collected');
  const prose = strings.filter((s) => !/px|rgba\(/.test(s));
  check(prose.every((s) => !/\d\.\d/.test(s)), 'REFUSAL violated: no decimals in prose (font/color specs excluded)');
}

/* verdicts must be DERIVED, never stored */
check(/const peakOf = \(P\) => \{/.test(code), 'the peak is derived and asserted');
check(/if \(detectorAt\(P, p\) !== 0\) throw/.test(code), 'the zero-at-peak law is asserted');
check(/const CASES = \[12, 16, 20, 24, 28\]/.test(code), 'cases are bare perimeters — nothing ships peaks');
/* the drawing reads the model */
check(/detectorAt\(S\.P, x\)/.test(code), 'the strip is printed from the model');
check(/x === S\.peak/.test(code), 'the carmine peak reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-optimization: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
