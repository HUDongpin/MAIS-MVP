/* ============================================================================
   audit-polynomialarithmetic.mjs — numeric proof for PolynomialArithmeticLab.jsx
   (HSA-APR.A.1 · the degree-slot ledger; closure is architectural).

   Run:  node audit-polynomialarithmetic.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PolynomialArithmeticLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PolynomialArithmeticLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, addPoly, mulPoly, depositsOf,
            coefOf, degreeOf, fmtInt, termText, polyText, SCENES, CASES, X_CHIPS,
            C_CHIPS, factorText, labelOf, xTruth, cTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, addPoly, mulPoly, depositsOf, coefOf, degreeOf, fmtInt, polyText,
  SCENES, CASES, X_CHIPS, C_CHIPS, factorText, labelOf, xTruth, cTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE LEDGER LAWS — convolution against brute term-by-term expansion.
   ------------------------------------------------------------------------- */
/* brute multiplication: expand every pair independently of mulPoly's loop */
const bruteMul = (A, B) => {
  const out = new Array(A.length + B.length - 1).fill(0);
  for (let m = 0; m < A.length; m++)
    for (let n = 0; n < B.length; n++) out[m + n] = out[m + n] + A[m] * B[n];
  return out;
};
const eq = (P, Q) => {
  const L = Math.max(P.length, Q.length);
  for (let k = 0; k < L; k++) if ((P[k] ?? 0) !== (Q[k] ?? 0)) return false;
  return true;
};
/* random integer polynomials: laws hold across the space */
let seed = 7;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed;
};
const randPoly = (deg) => {
  const P = [];
  for (let k = 0; k <= deg; k++) P.push((rnd() % 9) - 4);
  if (P[deg] === 0) P[deg] = 1;
  return P;
};
for (let t = 0; t < 120; t++) {
  const A = randPoly(1 + (rnd() % 3));
  const B = randPoly(1 + (rnd() % 3));
  check(eq(mulPoly(A, B), bruteMul(A, B)), 'convolution = brute expansion');
  check(eq(mulPoly(A, B), mulPoly(B, A)), 'products commute');
  check(degreeOf(mulPoly(A, B)) === degreeOf(A) + degreeOf(B), 'degrees add');
  check(
    mulPoly(A, B)[degreeOf(A) + degreeOf(B)] === A[degreeOf(A)] * B[degreeOf(B)],
    'top coefficients multiply'
  );
  const C = randPoly(1 + (rnd() % 2));
  check(eq(mulPoly(A, addPoly(B, C)), addPoly(mulPoly(A, B), mulPoly(A, C))), 'the distributive law holds slotwise');
  /* closure: every slot integer, finitely many slots */
  check(mulPoly(A, B).every(Number.isInteger), 'closure: integer slots only');
  /* deposits, merged by slot, equal the convolution */
  const merged = new Array(A.length + B.length - 1).fill(0);
  for (const s of depositsOf(A, B)) merged[s.slot] += s.val;
  check(eq(merged, mulPoly(A, B)), 'slips merge to the ledger');
  check(depositsOf(A, B).every((s) => s.slot === s.m + s.n && Number.isInteger(s.slot) && s.slot >= 0), 'every slip lands at m + n, a whole slot');
}

/* the worked scenes */
check(eq(addPoly([1, 3, 2], [5, -4, 1]), [6, -1, 3]), 'the sum scene: 3x² − x + 6');
check(polyText([6, -1, 3]) === `3x² ${MINUS} x + 6`, 'and it prints correctly');
check(eq(mulPoly([2, 1], [3, 1]), [6, 5, 1]), '(x+2)(x+3) = x² + 5x + 6');
check(depositsOf([2, 1], [3, 1]).length === 4, 'four slips mailed');
check(depositsOf([2, 1], [3, 1]).filter((s) => s.slot === 1).length === 2, 'two collide in slot 1');
check(eq(mulPoly([1, 0, 2], [0, 3, 1]), [0, 3, 1, 6, 2]), 'the dial scene at a = 2');
check(eq(mulPoly([1, 0, 3], [0, 3, 1]), [0, 3, 1, 9, 3]), 'the dial scene at a = 3 (note quoted)');
check(polyText([0, 0, 0]) === '0' && coefOf([1, 2], 5) === 0, 'empty slots read zero');
{
  let threw = false;
  try {
    degreeOf([0, 0]);
  } catch {
    threw = true;
  }
  check(threw, 'the zero ledger refuses a degree');
}
/* trailing zeros do not inflate the degree — cancellation in a sum */
check(degreeOf([3, 1, 0]) === 1 && degreeOf([5, 0, 0, 0]) === 0, 'degree reads the highest OCCUPIED slot');
check(degreeOf(addPoly([1, 2, 1], [1, 2, -1])) === 1, 'a cancelled top slot drops the degree');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/1 \+ 5, 3 − 4, 2 \+ 1/.test(STEPS[1].body), 'step 2 quotes the slotwise sums');
check(/3 − 4 = −1/.test(STEPS[1].note), 'step 2 note reads the middle slot');
check(3 - 4 === -1 && 1 + 5 === 6 && 2 + 1 === 3, 'and those sums are true');
check(/3 \+ 2 = 5/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key merges the collision');
check(/x² \+ 5x \+ 6/.test(STEPS[2].feedback), 'step 3 posts the product');
check(/like-terms bench/.test(STEPS[1].choices[STEPS[1].answer]), 'the merge law is cited');
check(/exponent bench/.test(STEPS[2].feedback), 'the address law is cited');
check(/slot 2\.5/.test(STEPS.map((s) => s.feedback ?? '').join('|')) || /slot 2\.5/.test(src.slice(compAt)), 'the no-fractional-slot argument appears');
check(/1 ÷ x/.test(STEPS[4].note) && /1 ÷ 2/.test(STEPS[4].note), 'the division exception mirrors the integers');

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
check(STEPS[0].scene === 'ledger' && STEPS[1].scene === 'sum' && STEPS[2].scene === 'product' && STEPS[3].scene === 'shuffle', 'the scene ladder');
check(!!SCENES.shuffle.dial, 'the dial rides the top-coefficient scene');
/* answer keys */
check(/^The coefficient of x\^k/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the slot meaning');
check(/^Different powers of x are different kinds/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: walls');
check(/^Both in slot 1/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the collision');
check(/^Degrees ADD and top coefficients MULTIPLY/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the top law');
check(/^Slips can only land in whole-numbered slots/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: closure');
check(/value of the polynomial at x = k/.test(STEPS[0].choices.join('|')), 'the evaluate-at-k confusion is offered');
check(/Degrees multiply/.test(STEPS[3].choices.join('|')), 'the degrees-multiply belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted products');
const xPosted = new Set(CASES.map((_, i) => xTruth(i)));
const cPosted = new Set(CASES.map((_, i) => cTruth(i)));
check(X_CHIPS.every((x) => xPosted.has(x)), 'every x chip is some case’s truth');
check(C_CHIPS.every((c) => cPosted.has(c)), 'every constant chip is some case’s truth');
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && xTruth(i) === xTruth(j) && cTruth(i) !== cTruth(j))),
  'two cases share an x-slot but not a constant'
);
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && cTruth(i) === cTruth(j) && xTruth(i) !== xTruth(j))),
  'two cases share a constant but not an x-slot'
);
for (let i = 0; i < CASES.length; i++) {
  const xT = xTruth(i);
  const cT = cTruth(i);
  check(X_CHIPS.includes(xT) && C_CHIPS.includes(cT), `case ${i}: truths are chips`);
  /* first principles: (a0 + a1 x)(b0 + b1 x) → x-slot a0·b1 + a1·b0; const a0·b0 */
  const { A, B } = CASES[i];
  check(xT === fmtInt(A[0] * B[1] + A[1] * B[0]), `case ${i}: x-slot from first principles`);
  check(cT === fmtInt(A[0] * B[0]), `case ${i}: constant from first principles`);
  check(depositsOf(A, B).filter((s) => s.slot === 1).length === 2, `case ${i}: the x-slot genuinely collides`);
  for (const xp of [null, ...X_CHIPS, 'bogus']) {
    for (const cp of [null, ...C_CHIPS]) {
      const should = xp === xT && cp === cT;
      check(isCalibrated(i, xp, cp) === should, `gate: case ${i} x=${xp} c=${cp}`);
      check([0, 50, 100].includes(closeness(i, xp, cp)), 'meter quantized');
    }
  }
  const wrongX = X_CHIPS.find((x) => x !== xT);
  check(closeness(i, wrongX, cT) === 0, `case ${i}: the constant without the x-slot earns nothing`);
  check(labelOf(i) === factorText(A) + factorText(B), `case ${i}: label posts the factors`);
}
check(calibChecks(null, '5', '6').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/rectangle|pull-apart|\bareas?\b|\btiles?\b/i, 'nothing has an area (DistributiveLab, MultiplicationLab)'],
  [/FOIL/i, 'no mnemonic — the ledger says why'],
  [/number line|\blanding strip/i, 'no parallel lines (LikeTermsLab; the bench is cited)'],
  [/\broots?\b|zeros? of|zero crossing|x-intercept|\bgraphs?\b|\bcurves?\b|parabola/i, 'no function pictures (PolynomialFunctionLab)'],
  [/factor train/i, 'no counting device (ExponentRulesLab; the bench is cited)'],
  [/long division|tableau|synthetic/i, 'division belongs to the next bench'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp)/, 'all arithmetic is integer'],
  [/\*\*/, 'no exponent operator — slots are addressed, not computed'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const mulPoly = \(A, B\) => \{/.test(code), 'the product is convolved, not stored');
check(/const depositsOf = \(A, B\) => \{/.test(code), 'slips are enumerated live');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/xslot|const:|truth|answer|product/i.test(block), 'no case ships its own totals');
}
/* the drawing reads the model */
check(/depositsOf\(A, B\)|S\.slips/.test(code), 'the slips are drawn from the model');
check(/addPoly\(S\.A, S\.B\)/.test(code), 'the sum row reads the model');
check(/polyText\(S\.A\)/.test(code), 'the cards print through polyText');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-polynomialarithmetic: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
