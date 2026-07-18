/* ============================================================================
   audit-compass.mjs — numeric proof for CompassLab.jsx
   (G-CO.D.12–13 · two circles decide a point; certificates, not measurements).

   Run:  node audit-compass.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./CompassLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function CompassLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, AB2, HALF2, heightSqOf,
            dist2XA, dist2XX, dist2MA, equilateralAt, onBisector, R2_SET, CASES,
            K_CHIPS, EQ_CHIPS, labelOf, kTruth, eqTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, AB2, HALF2, heightSqOf, dist2XA, dist2XX, dist2MA,
  equilateralAt, onBisector, R2_SET, CASES, K_CHIPS, EQ_CHIPS, labelOf, kTruth,
  eqTruth, makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CERTIFICATES — against float coordinate geometry (audit-only floats).
   ------------------------------------------------------------------------- */
check(AB2 === 64 && HALF2 === 16 && 8 * 8 === 64 && 4 * 4 === 16, 'the fixed segment: A(0,0), B(8,0)');
for (let r2 = 17; r2 <= 100; r2++) {
  const k = heightSqOf(r2);
  check(k === r2 - 16 && k > 0, `k = r² − 16 at r²=${r2}`);
  /* the crossing (4, √k) really lies on BOTH circles — float check */
  const y = Math.sqrt(k);
  const dA = 4 * 4 + y * y;
  const dB = (4 - 8) * (4 - 8) + y * y;
  check(Math.abs(dA - r2) < 1e-9 && Math.abs(dB - r2) < 1e-9, `the crossing is born on both circles (r²=${r2})`);
  /* the integer certificates agree */
  check(dist2XA(r2) === r2, `dist²(X, A) = r², by birth (r²=${r2})`);
  check(dist2XX(r2) === 4 * k, `dist²(X₊, X₋) = 4k (r²=${r2})`);
  /* the equidistance test passes for every crossing at every legal radius */
  check(onBisector(4, dist2XA(r2), dist2XA(r2)), `the crossing passes equidistance (r²=${r2})`);
  /* equilateral exactly at r² = 64 */
  check(equilateralAt(r2) === (r2 === 64), `equilateral iff r² = 64 (r²=${r2})`);
}
/* unreachable circles THROW — including the kiss at r = 4 */
for (const r2 of [1, 9, 16]) {
  let threw = false;
  try {
    heightSqOf(r2);
  } catch {
    threw = true;
  }
  check(threw, `r² = ${r2} refuses — no crossing is born`);
}
/* the midpoint's certificate */
check(dist2MA() === 16 && onBisector(4, 16, 16), 'M = (4,0): dist² 16 to each end');
/* the rational crossing at r = 5: (4, 3), the 3-4-5 corner */
check(heightSqOf(25) === 9 && 3 * 3 === 9 && 4 * 4 + 3 * 3 === 25, 'r = 5 births the rational point (4, 3)');
/* Euclid I.1 at r = 8: all three sides² equal */
check(dist2XA(64) === 64 && AB2 === 64 && 16 + 48 === 64, 'Euclid I.1: all sides² are 64');
/* the dial's height ladder */
check(R2_SET.map(heightSqOf).join(',') === '9,20,33,48,65', 'the heights 9, 20, 33, 48, 65');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/16 \+ 48 = 64/.test(STEPS[1].note), 'step 2 note runs the certificate sum');
check(/dist²\(M, A\) = 16 = dist²\(M, B\)/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key runs the test');
check(/9, 20, 33, 48, 65/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key posts the height ladder');
check(/\(4, 3\)/.test(STEPS[4].feedback), 'the rational crossing is quoted');
check(/r² − 16/.test(STEPS[4].body) || /r² − 16/.test(STEPS[5].body), 'the height law is posted');
check(/Proposition 1|Book I/.test(STEPS[1].feedback), 'Euclid is credited by name');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.r2) && s.r2 > 16, `step ${i} pins a legal radius`);
  check(['circles', 'triangle', 'bisector'].includes(s.show), `step ${i} scene valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].show === 'circles' && STEPS[1].show === 'triangle' && STEPS[2].show === 'bisector' && !!STEPS[4].dial, 'the scene ladder; the dial sweeps r');
/* answer keys */
check(/^Only from crossings/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the rulebook');
check(/^X lives on the circle centered at A/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the certificate');
check(/^The equidistance test/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the test');
check(/^Born on both circles/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: by birth');
check(/^The crossings’ heights change/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the invariant');
check(/looks about right|feels right|looks central/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the eyeballing belief is offered');
check(/all triangles between two circles are equilateral/.test(STEPS[1].choices.join('|')), 'the overreach belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 5, 'several posted radii');
const ksPosted = new Set(CASES.map((_, i) => kTruth(i)));
const eqsPosted = new Set(CASES.map((_, i) => eqTruth(i)));
check(K_CHIPS.every((k) => ksPosted.has(k)), 'every height chip is some case’s truth');
check(EQ_CHIPS.every((e) => eqsPosted.has(e)), 'both verdicts are posted');
check(CASES.filter((_, i) => eqTruth(i) === EQ_CHIPS[0]).length === 1, 'exactly one case is equilateral — the near-miss field');
for (let i = 0; i < CASES.length; i++) {
  const kT = kTruth(i);
  const eT = eqTruth(i);
  check(K_CHIPS.includes(kT) && EQ_CHIPS.includes(eT), `case ${i}: truths are chips`);
  check(kT === String(CASES[i] - 16), `case ${i}: height from first principles`);
  check((eT === EQ_CHIPS[0]) === (CASES[i] === 64), `case ${i}: verdict from first principles`);
  for (const kp of [null, ...K_CHIPS, 'bogus']) {
    for (const ep of [null, ...EQ_CHIPS]) {
      const should = kp === kT && ep === eT;
      check(isCalibrated(i, kp, ep) === should, `gate: case ${i} k=${kp} e=${ep}`);
      check([0, 50, 100].includes(closeness(i, kp, ep)), 'meter quantized');
    }
  }
  const wrongK = K_CHIPS.find((x) => x !== kT);
  check(closeness(i, wrongK, eT) === 0, `case ${i}: the verdict without the height earns nothing`);
  check(labelOf(i).includes(String(CASES[i])), `case ${i}: label posts the radius²`);
}
check(calibChecks(null, '48', 'equilateral').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/handshake|quarter turn|turned tile|run and rise|rise over run|\bslopes?\b/i, 'no slope machinery (PerpSlopeLab)'],
  [/\bdeficit\b|exchange rate|audit card/i, 'no audit machinery (TriangleSolveLab)'],
  [/inscribed|central angle|\bchords?\b/i, 'no circle theorems (CircleTheoremsLab)'],
  [/x² \+ y²|standard form|\bconics?\b/i, 'no circle equations (CircleLab)'],
  [/measure the|measuring tape|protractor reading/i, 'nothing is ever actually measured — certificates only'],
  [/census|constraint kit|\bswings?\b/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(pow|cbrt|log|exp|sin\(|cos\(|acos|atan)/, 'no float trig'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* Math.sqrt: renderer only, for pixel heights */
check(!/Math\.sqrt/.test(modelSrc), 'the model never square-roots');
check((codeSansCss.match(/Math\.sqrt/g) || []).length === 2, 'Math.sqrt appears only for the two pixel lengths in the renderer');

/* verdicts must be DERIVED, never stored */
check(/const heightSqOf = \(r2\) => \{/.test(code), 'the height is computed, not stored');
check(/const equilateralAt = \(r2\) => dist2XA\(r2\) === AB2/.test(code), 'the verdict rides the certificate');
check(/const CASES = \[25, 36, 49, 64, 81\]/.test(code), 'cases are bare radii — nothing ships verdicts');
/* the drawing reads the model */
check(/Math\.sqrt\(S\.r2\)/.test(code) && /Math\.sqrt\(S\.k\)/.test(code), 'the drawn circles and crossings read the model');
check(/S\.equi \?/.test(code), 'the triangle line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-compass: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
