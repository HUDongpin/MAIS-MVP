/* ============================================================================
   audit-trianglesolve.mjs — numeric proof for TriangleSolveLab.jsx
   (G-SRT.D.10–11 · the Pythagorean audit; the deficit prices the corner).

   Run:  node audit-trianglesolve.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./TriangleSolveLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function TriangleSolveLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, gcdOf, isTriangle,
            deficitOf, cosOf, fracText, verdictOf, SCENES, CASES, DEF_CHIPS,
            COS_CHIPS, labelOf, defTruth, cosTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtInt, gcdOf, isTriangle, deficitOf, cosOf, fracText,
  verdictOf, SCENES, CASES, DEF_CHIPS, COS_CHIPS, labelOf, defTruth, cosTruth,
  makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE AUDIT'S LAWS — against float geometry (floats live in the AUDIT only).
   ------------------------------------------------------------------------- */
/* verify cos C against coordinates: place C at origin, B at (a, 0),
   A at (b·cosC, b·sinC) — then |AB| must equal c exactly (to 1e-9) */
for (let a = 1; a <= 14; a++)
  for (let b = a; b <= 14; b++)
    for (let c = b; c < a + b && c <= 20; c++) {
      const d = deficitOf(a, b, c);
      const [n, den] = cosOf(a, b, c);
      const cosC = n / den;
      check(Math.abs(cosC) < 1, `|cos| < 1 for a real triangle (${a},${b},${c})`);
      const sinC = Math.sqrt(1 - cosC * cosC);
      const Ax = b * cosC;
      const Ay = b * sinC;
      const AB = Math.sqrt((Ax - a) * (Ax - a) + Ay * Ay);
      check(Math.abs(AB - c) < 1e-9, `the law closes the triangle (${a},${b},${c})`);
      /* the verdict against the float angle */
      const angle = Math.acos(cosC);
      const v = verdictOf(a, b, c);
      if (v === 'acute') check(angle < Math.PI / 2 - 1e-12, `acute verdict is acute (${a},${b},${c})`);
      else if (v === 'right') check(Math.abs(angle - Math.PI / 2) < 1e-9, `right verdict is right (${a},${b},${c})`);
      else check(angle > Math.PI / 2 + 1e-12, `obtuse verdict is obtuse (${a},${b},${c})`);
      /* scale-independence: double the triangle, same reduced cosine */
      const [n2, d2] = cosOf(2 * a, 2 * b, 2 * c);
      check(n2 === n && d2 === den, `the exchange rate is scale-blind (${a},${b},${c})`);
      /* the deficit's sign matches the verdict */
      check((d > 0) === (v === 'acute') && (d === 0) === (v === 'right'), `sign law (${a},${b},${c})`);
    }
/* illegal triples must THROW */
for (const [a, b, c] of [[1, 2, 3], [2, 3, 6], [1, 1, 5]]) {
  let threw = false;
  try {
    deficitOf(a, b, c);
  } catch {
    threw = true;
  }
  check(threw, `the audit refuses the non-triangle (${a},${b},${c})`);
}
/* the worked audits */
check(deficitOf(5, 12, 13) === 0 && 25 + 144 === 169, 'the zero line: 5-12-13');
check(deficitOf(5, 6, 7) === 12 && fracText(cosOf(5, 6, 7)) === '1/5', '(5,6,7): deficit 12, cos 1/5');
check(deficitOf(3, 5, 7) === -15 && fracText(cosOf(3, 5, 7)) === `${MINUS}1/2`, '(3,5,7): deficit −15, cos −1/2');
check(Math.abs(Math.acos(-1 / 2) - (2 * Math.PI) / 3) < 1e-12, 'and cos = −1/2 really is 120°');
/* the dial law: deficit(5,6,c) = 61 − c², sign flip between 7 and 8, never zero on integers */
for (let c = 2; c <= 10; c++) check(deficitOf(5, 6, c) === 61 - c * c, `dial deficit at c=${c}`);
check(deficitOf(5, 6, 7) > 0 && deficitOf(5, 6, 8) < 0, 'the sign flips between 7 and 8');
for (let r = 1; r <= 10; r++) check(r * r !== 61, '61 is not a perfect square — the crossing is unreachable');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/25 \+ 144 = 169/.test(STEPS[0].body), 'step 1 runs the accounts');
check(/61 against 49/.test(STEPS[1].body) && 25 + 36 === 61 && 7 * 7 === 49, 'step 2 posts both audits');
check(/34 against 49/.test(STEPS[1].body) && 9 + 25 === 34, 'and the blunt one');
check(/12\/60 = 1\/5/.test(STEPS[2].body), 'step 3 exchanges the deficit');
check(/−15\/30 =\s*−1\/2/.test(STEPS[3].body.replace(/\s+/g, ' ')) && 2 * 3 * 5 === 30, 'step 4 prices 120°');
check(/61 − c²/.test(STEPS[4].body), 'step 5 posts the dial law');
check(/rearrangement bench/.test(STEPS[0].choices[STEPS[0].answer]), 'the theorem is credited');
check(/triangle-trig bench/.test(STEPS[2].feedback), 'the name cosine is credited');
check(/construction bench/.test(STEPS[4].note), 'the boundary story is ceded');
check(/c² = a² \+ b² − 2ab·cos C/.test(STEPS[2].feedback), 'the law itself is stated');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!SCENES[s.scene], `step ${i} scene exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].scene === 'right' && STEPS[3].scene === 'blunt' && !!STEPS[4].dial, 'the scene ladder; the dial slides c');
/* answer keys */
check(/^A right corner — the converse/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the zero line');
check(/^Positive: the corner beats right/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the sign');
check(/^Scale-independence/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: why 2ab');
check(/^120° exactly/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the named corner');
check(/^Between c = 7 \(deficit \+12\) and c = 8/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the unreachable crossing');
check(/perimeter/.test(STEPS[2].choices.join('|')), 'the perimeter confusion is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted triples');
for (const t of CASES) check(t[2] >= t[0] && t[2] >= t[1], 'the faced side is the largest');
const defsPosted = new Set(CASES.map((_, i) => defTruth(i)));
const cossPosted = new Set(CASES.map((_, i) => cosTruth(i)));
check(DEF_CHIPS.every((d) => defsPosted.has(d)), 'every deficit chip is some case’s truth');
check(COS_CHIPS.every((c) => cossPosted.has(c)), 'every cosine chip is some case’s truth');
/* the verdict categories repeat while the exact prices differ */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && verdictOf(...CASES[i]) === verdictOf(...CASES[j]) && cosTruth(i) !== cosTruth(j))),
  'two cases share a verdict but not a cosine'
);
for (let i = 0; i < CASES.length; i++) {
  const dT = defTruth(i);
  const cT = cosTruth(i);
  check(DEF_CHIPS.includes(dT) && COS_CHIPS.includes(cT), `case ${i}: truths are chips`);
  const [a, b, c] = CASES[i];
  check(dT === fmtInt(a * a + b * b - c * c), `case ${i}: deficit from raw squares`);
  const g = gcdOf(a * a + b * b - c * c, 2 * a * b);
  const n = (a * a + b * b - c * c) / g;
  const den = (2 * a * b) / g;
  check(cT === (n === 0 ? '0' : `${n < 0 ? MINUS : ''}${Math.abs(n)}/${den}`), `case ${i}: cosine from first principles`);
  for (const dp of [null, ...DEF_CHIPS, 'bogus']) {
    for (const cp of [null, ...COS_CHIPS]) {
      const should = dp === dT && cp === cT;
      check(isCalibrated(i, dp, cp) === should, `gate: case ${i} d=${dp} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, dp, cp)), 'meter quantized');
    }
  }
  const wrongD = DEF_CHIPS.find((x) => x !== dT);
  check(closeness(i, wrongD, cT) === 0, `case ${i}: the cosine without the deficit earns nothing`);
  check(labelOf(i).includes(String(CASES[i][2])), `case ${i}: label posts the faced side`);
}
check(calibChecks(null, '12', '1/5').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bswings?\b|\bcensus\b|constraint kit|landings?/i, 'no census machinery (TriangleBuildLab)'],
  [/corner fan|ratio ledger|opp\/hyp|\bSOH\b/i, 'no quotient machinery (TrigRatioLab; the name is purchased)'],
  [/budget bar|radius triangle|unit circle/i, 'no identity machinery (PythagoreanIdentityLab)'],
  [/rearrangement proof|four copies|\bshear/i, 'the proof stays on the rearrangement bench'],
  [/\bledgers?\b|deposit|degree-slot/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/law of sines|ambiguous case/i, 'one instrument per bench — the sines story is not smuggled in'],
  [/census|kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(pow|cbrt|log|exp|sin\(|cos\(|acos|atan)/, 'no float trig in the lab'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* Math.sqrt appears exactly once — in the renderer, never in the model */
check((codeSansCss.match(/Math\.sqrt/g) || []).length === 1, 'Math.sqrt lives only in the renderer');
check(!/Math\.sqrt/.test(modelSrc), 'the model never square-roots');

/* verdicts must be DERIVED, never stored */
check(/const deficitOf = \(a, b, c\) => \{/.test(code), 'the deficit is computed live');
check(/const cosOf = \(a, b, c\) => \{/.test(code), 'the cosine is exchanged live');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/deficit|cos|truth|answer|verdict/i.test(block), 'no case ships its own audit');
}
/* the drawing reads the model */
check(/S\.cosFrac\[0\] \/ S\.cosFrac\[1\]/.test(code), 'the drawn corner reads the exact cosine');
check(/fmtInt\(S\.deficit\)/.test(code), 'the gauge reads the model');
check(/fracText\(S\.cosFrac\)/.test(code), 'the exchange line reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-trianglesolve: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
