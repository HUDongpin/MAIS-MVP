/* ============================================================================
   audit-piecewise.mjs — numeric proof for PiecewiseLab.jsx
   (HSF-IF.C.7b · the jurisdiction map; one deed per border).

   Run:  node audit-piecewise.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PiecewiseLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PiecewiseLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, RULES, ruleFor, evalF,
            BORDERS, deedOf, losingValueAt, jumpAt, CASES, RULE_CHIPS, VAL_CHIPS,
            labelOf, ruleTruth, valTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtInt, RULES, ruleFor, evalF, BORDERS, deedOf, losingValueAt,
  jumpAt, CASES, RULE_CHIPS, VAL_CHIPS, labelOf, ruleTruth, valTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE PARTITION THEOREM — exactly one claim at every probe.
   ------------------------------------------------------------------------- */
check(RULES.length === 3, 'three jurisdictions');
for (let x = -10; x <= 10; x++) {
  const claims = RULES.filter((r) => r.test(x));
  check(claims.length === 1, `partition at x=${x}: exactly one claim`);
  check(ruleFor(x).id === claims[0].id, `ruleFor agrees at ${x}`);
  check(Number.isInteger(evalF(x)), `integer payout at ${x}`);
}
/* the map itself, against an independent restatement */
const bruteF = (x) => (x < -1 ? x + 4 : x < 2 ? 2 : 2 * x - 3);
for (let x = -10; x <= 10; x++) check(evalF(x) === bruteF(x), `evalF = brute at ${x}`);
/* the deeds: −1 belongs to the middle, 2 belongs to the right */
check(deedOf(-1) === 'B' && evalF(-1) === 2, 'the deed at −1: the middle rule, f(−1) = 2');
check(deedOf(2) === 'C' && evalF(2) === 1, 'the deed at 2: the right rule, f(2) = 1');
/* the waived sides and the jumps */
check(losingValueAt(-1) === 3 && -1 + 4 === 3, 'the left rule would pay 3 at −1');
check(losingValueAt(2) === 2, 'the middle rule would pay 2 at 2');
check(jumpAt(-1) === -1 && jumpAt(2) === -1, 'both borders tear by exactly 1');
/* dot grammar: at each border exactly one owner among rules touching it */
for (const b of BORDERS) {
  const touching = RULES.filter((r) => r.test(b) || r.test(b - 1) || r.test(b + 1));
  const owners = touching.filter((r) => r.test(b));
  check(owners.length === 1, `border ${b}: exactly one deed among ${touching.length} touchers`);
}
/* the quoted evaluations */
check(evalF(0) === 2, 'f(0) = 2');
check(2 * 2 - 3 === 1, 'the step-4 arithmetic: 2·2 − 3 = 1');
check(evalF(-3) === 1 && evalF(-2) === 2 && evalF(3) === 3 && evalF(4) === 5, 'the capstone payouts');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/−1 \+ 4 = 3/.test(STEPS[1].body), 'step 2 computes the losing bid');
check(/2·2 − 3 = 1/.test(STEPS[3].body) || /2·2 − 3 = 1/.test(STEPS[4].choices[STEPS[4].answer]), 'the deed at 2 is computed in copy');
check(/postage, parking, tax brackets/.test(STEPS[2].feedback), 'step 3 grounds the step function');
check(/limits/.test(src.slice(0, importAt)) || /NEAR each point/.test(STEPS[2].note), 'the at/near split is stated');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.probe), `step ${i} pins a probe`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[1].probe === -1 && STEPS[3].probe === 2 && !!STEPS[4].dial, 'the probes visit both borders; the dial walks');
/* answer keys */
check(/^2 — the probe 0 lies in the middle territory/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: territory first');
check(/^2 — the middle territory reads/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the deed');
check(/^No — every input still gets exactly one output/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the contract');
check(/^f\(2\) would have two values/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the crime');
check(/^The right rule: f\(2\) = 2·2 − 3 = 1/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: where you ARE');
check(/without lifting the pen/.test(STEPS[2].choices.join('|')), 'the pen-lift belief is offered');
check(/because you came from its side/.test(STEPS[4].choices.join('|')), 'the momentum belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted probes');
check(new Set(CASES).size === CASES.length, 'probes distinct');
check(CASES.includes(-1) && CASES.includes(2), 'both borders are posted as probes');
const rulesPosted = new Set(CASES.map((_, i) => ruleTruth(i)));
const valsPosted = new Set(CASES.map((_, i) => valTruth(i)));
check(RULE_CHIPS.every((r) => rulesPosted.has(r)), 'every rule chip is some case’s truth');
check(VAL_CHIPS.every((v) => valsPosted.has(v)), 'every value chip is some case’s truth');
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && valTruth(i) === valTruth(j) && ruleTruth(i) !== ruleTruth(j))),
  'two cases share a payout but not a rule'
);
for (let i = 0; i < CASES.length; i++) {
  const rT = ruleTruth(i);
  const vT = valTruth(i);
  check(RULE_CHIPS.includes(rT) && VAL_CHIPS.includes(vT), `case ${i}: truths are chips`);
  check(vT === fmtInt(bruteF(CASES[i])), `case ${i}: payout from the brute map`);
  for (const rp of [null, ...RULE_CHIPS, 'bogus']) {
    for (const vp of [null, ...VAL_CHIPS]) {
      const should = rp === rT && vp === vT;
      check(isCalibrated(i, rp, vp) === should, `gate: case ${i} r=${rp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, rp, vp)), 'meter quantized');
    }
  }
  const wrongR = RULE_CHIPS.find((x) => x !== rT);
  check(closeness(i, wrongR, vT) === 0, `case ${i}: the payout without the rule earns nothing`);
  check(labelOf(i).includes(fmtInt(CASES[i])), `case ${i}: label posts the probe`);
}
check(calibChecks(null, '2', '2').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bfolds?\b|absolute value|\|x\|/i, 'no fold (AbsoluteValueLab)'],
  [/\blimits?\b|approach(es|ing)?\b|creep/i, 'nothing approaches — AT, never NEAR'],
  [/slope triangle|rise over run|\bsteepness/i, 'no line anatomy (LineFunctionLab)'],
  [/\bstory\b|\btale\b/i, 'no graph stories (GraphStoryLab)'],
  [/one-way gate|checkpoint|intruder/i, 'no gate machinery (ExtraneousLab)'],
  [/\bwindows?\b(?!\.)|spokesperson|roster/i, 'no seating machinery (ArcsinLab; window. is the browser API)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|cos)/, 'all arithmetic is integer'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const ruleFor = \(x\) => \{/.test(code), 'the owner is found by predicate, not lookup');
check(/if \(claims\.length !== 1\) throw/.test(code), 'the partition theorem is asserted');
check(/const CASES = \[-3, -2, -1, 2, 3, 4\]/.test(code), 'cases are bare probes — no case ships its payout');
/* the drawing reads the model */
check(/r\.id === S\.firing\.id/.test(code), 'the lit card reads the model');
check(/yOf\(S\.fx\)/.test(code), 'the probe dot sits at the computed payout');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-piecewise: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
