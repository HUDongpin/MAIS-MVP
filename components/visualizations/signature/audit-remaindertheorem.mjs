/* ============================================================================
   audit-remaindertheorem.mjs — numeric proof for RemainderTheoremLab.jsx
   (HSA-APR.B.2 · the Horner fold; one fold, two theorems).

   Run:  node audit-remaindertheorem.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RemainderTheoremLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RemainderTheoremLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, F, foldAt, remainderAt,
            quotientAt, fmtInt, quotientText, CASES, CARRY_CHIPS, R_CHIPS,
            labelOf, carryTruth, rTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, F, foldAt, remainderAt, quotientAt, fmtInt, quotientText,
  CASES, CARRY_CHIPS, R_CHIPS, labelOf, carryTruth, rTruth, makeCase, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE FOLD — against brute evaluation AND the division identity.
   ------------------------------------------------------------------------- */
check(F.length === 4 && F.join(',') === '1,-2,-5,6', 'the fixed cubic x³ − 2x² − 5x + 6');
/* brute f(a), computed by literal powers — never by the fold */
const bruteF = (a) => a * a * a - 2 * a * a - 5 * a + 6;
for (let a = -10; a <= 10; a++) {
  const cs = foldAt(a);
  check(cs.length === 4 && cs[0] === F[0], `fold at ${a}: four cells, seeded by the lead`);
  check(cs[3] === bruteF(a), `fold at ${a}: last cell = f(${a}) by brute powers`);
  check(remainderAt(a) === cs[3], `remainderAt reads the last cell`);
  check(cs.every(Number.isInteger), `fold at ${a}: integer carries`);
  /* THE DIVISION IDENTITY: expand (x − a)(c2 x² + c1 x + c0) + r symbolically */
  const [c2, c1, c0] = quotientAt(a);
  const expanded = [
    /* x³ */ c2,
    /* x² */ c1 - a * c2,
    /* x  */ c0 - a * c1,
    /* 1  */ cs[3] - a * c0,
  ];
  check(expanded.join(',') === F.join(','), `fold at ${a}: (x − a)q + r recovers f exactly`);
}
/* the factorization: f = (x − 1)(x + 2)(x − 3), so exactly these probes are clean */
const cleanProbes = [];
for (let a = -10; a <= 10; a++) if (remainderAt(a) === 0) cleanProbes.push(a);
check(cleanProbes.join(',') === '-2,1,3', 'the clean divisors are exactly −2, 1, 3');
check((1 - 1) * (1 + 2) * (1 - 3) === 0 && bruteF(1) === 0 && bruteF(-2) === 0 && bruteF(3) === 0, 'the split checks by hand');
/* the worked folds quoted in the lesson */
check(foldAt(2).join(',') === '1,0,-5,-4', 'the fold at 2: 1, 0, −5, −4');
check(foldAt(1).join(',') === '1,-1,-6,0', 'the fold at 1: 1, −1, −6, 0');
check(quotientText(2) === `x² ${MINUS} 5`, 'the quotient at 2 prints x² − 5');
check(quotientText(1) === `x² ${MINUS} x ${MINUS} 6`, 'the quotient at 1 prints x² − x − 6');
/* step 4's note: fold the quotient x² − x − 6 at 3 and get 0 */
check(3 * 3 - 3 - 6 === 0, 'the quotient itself splits at 3');
/* nested evaluation quoted in step 1 */
check(((1 * 2 - 2) * 2 - 5) * 2 + 6 === -4, 'the nesting computes −4');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/1·2 − 2 = 0/.test(STEPS[0].body) && /0·2 − 5 = −5/.test(STEPS[0].body) && /−5·2 \+ 6 = −4/.test(STEPS[0].body), 'step 1 posts each fold computation');
check(1 * 2 - 2 === 0 && 0 * 2 - 5 === -5 && -5 * 2 + 6 === -4, 'and each computation is true');
check(/\(\(1·2 − 2\)·2 − 5\)·2 \+ 6 = −4/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key nests the evaluation');
check(/1, 0, −5/.test(STEPS[1].body), 'step 2 posts the carries');
check(/x³ − 2x² − 5x \+ 10/.test(STEPS[1].feedback), 'step 2 multiplies back');
check(/1, −1, −6, 0/.test(STEPS[3].body), 'step 4 posts the zero fold');
check(/x² − x − 6/.test(STEPS[3].choices[STEPS[3].answer]) || /x² − x − 6/.test(STEPS[3].note), 'step 4 posts the quotient');
check(/a = −2, 1, and 3|a = −2, 1, 3/.test(STEPS[4].choices[STEPS[4].answer] + STEPS[4].feedback), 'step 5 names the three stops');
check(/\(x − 1\)\(x \+ 2\)\(x − 3\)/.test(STEPS[4].feedback), 'step 5 posts the full split');
check(/function bench/.test(STEPS[4].note), 'the graph is ceded to the function bench');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.a), `step ${i} pins a probe`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].a === 2 && STEPS[3].a === 1 && !!STEPS[4].dial, 'the probe ladder; the dial on step 5');
/* answer keys */
check(/^f\(2\) — the fold is nested evaluation/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: evaluation');
check(/^The coefficients of the quotient/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the moonlighting carries');
check(/^f\(a\) = 0·q\(a\) \+ r = r/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the one-line proof');
check(/^\(x − 1\) divides f cleanly/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the factor edge');
check(/^Three — at a = −2, 1, and 3/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: three stops');
check(/Random intermediate junk/.test(STEPS[1].choices.join('|')), 'the junk belief is offered');
check(/f is the zero polynomial/.test(STEPS[3].choices.join('|')), 'the zero-poly confusion is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted probes');
check(new Set(CASES).size === CASES.length, 'probes distinct');
const carriesPosted = new Set(CASES.map((_, i) => carryTruth(i)));
const rsPosted = new Set(CASES.map((_, i) => rTruth(i)));
check(CARRY_CHIPS.every((c) => carriesPosted.has(c)), 'every carry chip is some case’s truth');
check(R_CHIPS.every((r) => rsPosted.has(r)), 'every remainder chip is some case’s truth');
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && rTruth(i) === rTruth(j) && carryTruth(i) !== carryTruth(j))),
  'two cases share a remainder but not a carry'
);
for (let i = 0; i < CASES.length; i++) {
  const kT = carryTruth(i);
  const rT = rTruth(i);
  check(CARRY_CHIPS.includes(kT) && R_CHIPS.includes(rT), `case ${i}: truths are chips`);
  /* first principles, without the fold: q's constant = a² − 2a − 5; r = f(a) */
  const a = CASES[i];
  check(kT === fmtInt(a * a - 2 * a - 5), `case ${i}: carry from first principles`);
  check(rT === fmtInt(bruteF(a)), `case ${i}: remainder from brute powers`);
  for (const kp of [null, ...CARRY_CHIPS, 'bogus']) {
    for (const rp of [null, ...R_CHIPS]) {
      const should = kp === kT && rp === rT;
      check(isCalibrated(i, kp, rp) === should, `gate: case ${i} k=${kp} r=${rp}`);
      check([0, 50, 100].includes(closeness(i, kp, rp)), 'meter quantized');
    }
  }
  const wrongK = CARRY_CHIPS.find((x) => x !== kT);
  check(closeness(i, wrongK, rT) === 0, `case ${i}: the remainder without the carry earns nothing`);
  check(labelOf(i).includes(fmtInt(a)), `case ${i}: label posts the probe`);
}
check(calibChecks(null, '3', '0').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/tableau|bring.down|synthetic/i, 'no tableau, no borrowed name (LongDivisionLab)'],
  [/degree-slot|\bledger\b|deposit|\bslips?\b|mailed/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/\bgraphs?\b|\bcurves?\b|x-intercept|crossing point|parabola/i, 'no function pictures (PolynomialFunctionLab)'],
  [/\broots?\b|zeros? of/i, 'clean divisors, not roots — the function bench owns zeros'],
  [/factor train|\btiles?\b/i, 'no counting device (ExponentRulesLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp)/, 'all arithmetic is integer'],
  [/\*\*/, 'no exponent operator — the fold multiplies step by step'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const foldAt = \(a\) => \{/.test(code), 'the fold is threaded, not stored');
check(/const remainderAt = \(a\) => foldAt\(a\)\[F\.length - 1\]/.test(code), 'the remainder reads the last cell');
check(/const CASES = \[-2, -1, 0, 1, 2, 3\]/.test(code), 'cases are bare probes — no case ships its carries');
/* the drawing reads the model */
check(/S\.carries\[i\]/.test(code), 'the cells are drawn from the fold');
check(/quotientText\(S\.a\)/.test(code), 'the bracket prints through the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-remaindertheorem: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
