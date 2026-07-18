/* ============================================================================
   audit-vector.mjs — numeric proof for VectorLab.jsx
   (HSN-VM.A.1–3, B.4–5 · the errand chain; tallies add separately).

   Run:  node audit-vector.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./VectorLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function VectorLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, fmtInt, vecText, addV, scaleV, negV,
            mag2Of, walkOf, V, W, CASES, SUM_CHIPS, MAG_CHIPS, labelOf, sumTruth,
            magTruth, makeCase, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, vecText, addV, scaleV, negV, mag2Of, walkOf, V, W, CASES, SUM_CHIPS,
  MAG_CHIPS, labelOf, sumTruth, magTruth, makeCase, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE ERRAND ALGEBRA — laws across the integer grid.
   ------------------------------------------------------------------------- */
const eqV = (a, b) => a[0] === b[0] && a[1] === b[1];
for (let ax = -5; ax <= 5; ax++)
  for (let ay = -5; ay <= 5; ay++) {
    const a = [ax, ay];
    for (let bx = -4; bx <= 4; bx += 2)
      for (let by = -4; by <= 4; by += 2) {
        const b = [bx, by];
        /* commutativity and the tip-to-tail identity */
        check(eqV(addV(a, b), addV(b, a)), `a+b = b+a at (${ax},${ay}),(${bx},${by})`);
        /* the walk lands where the componentwise sum says */
        const walk = walkOf([a, b]);
        check(eqV(walk[2], addV(a, b)), `the chain lands on the sum (${ax},${ay}),(${bx},${by})`);
        /* associativity with a third leg */
        const c = [1, -2];
        check(eqV(addV(addV(a, b), c), addV(a, addV(b, c))), `associativity (${ax},${ay})`);
        /* triangle inequality in squared form is NOT claimed — but the
           parallelogram law is: |a+b|² + |a−b|² = 2|a|² + 2|b|² */
        const d = addV(a, negV(b));
        check(mag2Of(addV(a, b)) + mag2Of(d) === 2 * mag2Of(a) + 2 * mag2Of(b), `the parallelogram law (${ax},${ay}),(${bx},${by})`);
      }
    /* cancellation and the zero errand */
    check(eqV(addV(a, negV(a)), [0, 0]), `v + (−v) = 0 at (${ax},${ay})`);
    /* scaling laws: |k·v|² = k²|v|², direction preserved or reversed */
    for (let k = -3; k <= 3; k++) {
      check(mag2Of(scaleV(k, a)) === k * k * mag2Of(a), `|k·v|² = k²|v|² at k=${k}, (${ax},${ay})`);
      check(eqV(scaleV(k, a), [k * ax, k * ay]), `scaling is componentwise at k=${k}`);
    }
  }
/* the lesson's fixed errands */
check(vecText(V) === '(3, 1)' && vecText(W) === '(1, 2)', 'the posted errands');
check(eqV(addV(V, W), [4, 3]) && 3 + 1 === 4 && 1 + 2 === 3, 'the shortcut (4, 3)');
check(mag2Of(V) === 10 && 3 * 3 + 1 * 1 === 10, '|v|² = 10');
check(mag2Of([1, 3]) === 10, '(1, 3) reaches equally far — the step-1 foil');
check([1, 2, 3].map((k) => mag2Of(scaleV(k, V))).join(',') === '10,40,90', 'the dial ladder 10, 40, 90');
check(mag2Of(scaleV(-1, V)) === 10, 'the flip keeps the reach — squares forget signs');
check(eqV(scaleV(2, V), [6, 2]) && eqV(negV(V), [-3, -1]), 'the scale and the reverse');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/go 3 east, 1 north/.test(STEPS[0].body), 'step 1 reads the errand');
check(/\(3, 1\) and ' \+\s*'\(1, 3\)/.test(STEPS[0].feedback) || /\(1, 3\)/.test(STEPS[0].feedback), 'the equal-reach foil is posted');
check(/\(3\+1, 1\+2\)/.test(STEPS[1].q), 'step 2 asks about the tallies');
check(/3 − 3 = 0 east, 1 − 1 =/.test(STEPS[3].feedback), 'step 4 cancels by tally');
check(/\(3k\)² \+ \(k\)² = k²·10/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key scales the squares');
check(/10, 40, 90/.test(STEPS[4].feedback), 'and posts the ladder');
check(/rearrangement bench/.test(STEPS[4].body), 'the reach theorem is credited');
check(/roots bench/.test(STEPS[4].feedback), 'the extraction craft is credited');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(['free', 'chain', 'both', 'scale'].includes(s.scene), `step ${i} scene valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].scene === 'free' && STEPS[2].scene === 'both' && STEPS[4].scene === 'scale' && !!STEPS[4].dial, 'the scene ladder; the dial scales');
/* answer keys */
check(/^Same components/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^East steps and north steps pile up separately/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^\(4, 3\) again/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^\(0, 0\) — the stay-home errand/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^It multiplies by k²/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/Same starting point/.test(STEPS[0].choices.join('|')), 'the anchored-arrow belief is offered');
check(/order matters for journeys/.test(STEPS[2].choices.join('|')), 'the order belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted pairs');
const sumsPosted = new Set(CASES.map((_, i) => sumTruth(i)));
const magsPosted = new Set(CASES.map((_, i) => magTruth(i)));
check(SUM_CHIPS.every((s) => sumsPosted.has(s)), 'every sum chip is some case’s truth');
check(MAG_CHIPS.every((m) => magsPosted.has(m)), 'every reach chip is some case’s truth');
/* the engineered near-miss: same reach², different sums (25 twice) */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && magTruth(i) === magTruth(j) && sumTruth(i) !== sumTruth(j))),
  'two cases share a reach² but not a sum'
);
for (let i = 0; i < CASES.length; i++) {
  const sT = sumTruth(i);
  const mT = magTruth(i);
  check(SUM_CHIPS.includes(sT) && MAG_CHIPS.includes(mT), `case ${i}: truths are chips`);
  const { v, w } = CASES[i];
  check(sT === `(${v[0] + w[0]}, ${v[1] + w[1]})`, `case ${i}: sum from first principles`);
  const sx = v[0] + w[0];
  const sy = v[1] + w[1];
  check(mT === String(sx * sx + sy * sy), `case ${i}: reach² from first principles`);
  for (const sp of [null, ...SUM_CHIPS, 'bogus']) {
    for (const mp of [null, ...MAG_CHIPS]) {
      const should = sp === sT && mp === mT;
      check(isCalibrated(i, sp, mp) === should, `gate: case ${i} s=${sp} m=${mp}`);
      check([0, 50, 100].includes(closeness(i, sp, mp)), 'meter quantized');
    }
  }
  const wrongS = SUM_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, mT) === 0, `case ${i}: the reach without the sum earns nothing`);
  check(labelOf(i).includes(vecText(v)), `case ${i}: label posts the errands`);
}
check(calibChecks(null, '(4, 3)', '25').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/quarter turn|handshake|turned tile|perpendicular/i, 'no turning (PerpSlopeLab)'],
  [/dot product|projection|\bcross\b/i, 'no products of arrows'],
  [/\bimaginary\b|complex plane|×i/i, 'no multiplying arrows (ComplexPlaneLab)'],
  [/\bslopes?\b|rise over run/i, 'no line anatomy'],
  [/degree-slot|\bledgers?\b|deposit/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/\bgallery\b|promise band/i, 'no sampling machinery (SamplingDistributionLab)'],
  [/census|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|acos|asin)/, 'no float roots — reach² only'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* renderer trig only for arrowheads */
check(!/Math\.(cos|sin|atan)/.test(modelSrc), 'no trig in the model');

/* verdicts must be DERIVED, never stored */
check(/const addV = \(\[a, b\], \[c, d\]\) => \[a \+ c, b \+ d\]/.test(code), 'addition is componentwise, one law');
check(/const mag2Of = \(\[x, y\]\) => x \* x \+ y \* y/.test(code), 'reach² is squared components');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/sum|mag|truth|answer/i.test(block), 'no case ships its own sum');
}
/* the drawing reads the model */
check(/arrow\(\[0, 0\], S\.sum, CARMINE/.test(code), 'the shortcut is drawn from the model');
check(/mag2Of\(S\.sum\)/.test(code), 'the reach line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-vector: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
