/* ============================================================================
   audit-fractiondivision.mjs — numeric + structural proof for
   FractionDivisionLab.jsx (6.NS.A.1 · the common coin; invert-and-multiply
   unmasked as the exchange).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the exchange law a/b ÷ c/d = ad/(cb) = a/b × d/c over
   a broad grid, every posted case's counts and quotient re-derived by an
   independent lcm, every quoted number in the copy, the stamp — and
   grep-enforce the refusals (no stick, no ribbon, no array, no "flip").

   Run:  node audit-fractiondivision.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./FractionDivisionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function FractionDivisionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, gcdInt, lcmInt, frac, fracText, coinOf,
            countsOf, quotientOf, invertMultiply, coinName, divText, CASES, makeCase,
            countsText, countsChips, quotientTruth, quotientChips, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, gcdInt, lcmInt, frac, fracText, coinOf, countsOf, quotientOf, invertMultiply,
  coinName, divText, CASES, makeCase, countsText, countsChips, quotientTruth, quotientChips,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE EXCHANGE LAW — over a broad grid, with an independent lcm.
   ------------------------------------------------------------------------- */
const myGcd = (x, y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};
const myLcm = (x, y) => (x / myGcd(x, y)) * y;
for (let a = 1; a <= 6; a++)
  for (let b = 2; b <= 8; b++)
    for (let c = 1; c <= 6; c++)
      for (let d = 2; d <= 8; d++) {
        const L = myLcm(b, d);
        const k = countsOf([a, b, c, d]);
        if (a === 1 && c === 1) check(coinOf([a, b, c, d]) === L, `coin ${b},${d}: the least common denominator`);
        check(k.coin === L && k.dividend === (a * L) / b && k.divisor === (c * L) / d, `counts ${a}/${b} ÷ ${c}/${d}`);
        /* the exchange equals invert-and-multiply, exactly */
        const q1 = quotientOf([a, b, c, d]);
        const q2 = invertMultiply([a, b, c, d]);
        check(q1.n === q2.n && q1.d === q2.d, `exchange = invert-multiply at ${a}/${b} ÷ ${c}/${d}`);
        /* and both equal first principles: (a/b) / (c/d) = ad/(bc), reduced */
        const g = myGcd(a * d, b * c);
        check(q1.n === (a * d) / g && q1.d === (b * c) / g, `first principles at ${a}/${b} ÷ ${c}/${d}`);
      }

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(countsOf([2, 3, 3, 4]).coin === 12, 'the twelfth is the common coin of thirds and fourths');
check(countsOf([2, 3, 3, 4]).dividend === 8 && countsOf([2, 3, 3, 4]).divisor === 9, '2/3 is 8 twelfths; 3/4 is 9');
check(fracText(quotientOf([2, 3, 3, 4])) === '8/9', 'the fit is 8/9 of once');
check(countsOf([3, 4, 1, 8]).dividend === 6 && countsOf([3, 4, 1, 8]).divisor === 1, '3/4 is 6 eighths');
check(fracText(quotientOf([3, 4, 1, 8])) === '6', '3/4 ÷ 1/8 = 6');
check(fracText(frac(3 * 1, 4 * 8)) === '3/32', 'the straight-across foil is 3/32');
check(countsOf([1, 2, 1, 8]).dividend === 4, '1/2 is 4 eighths');
check(fracText(quotientOf([3, 5, 1, 10])) === '6', '3/5 ÷ 1/10 = 6');
check(coinName(12) === 'twelfths' && coinName(8) === 'eighths' && coinName(40) === 'fortieths', 'the coin names');
check(/8 twelfths/.test(STEPS[1].body) && /9 twelfths/.test(STEPS[1].body), 'step 2 quotes the exchange');
check(/6 coins measured by/.test(STEPS[2].body), 'step 3 quotes the even landing');
check(/4 coins measured by 1/.test(STEPS[4].body), 'step 5 quotes the growth case');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Array.isArray(s.pose) && s.pose.length === 4 && s.pose.every(Number.isInteger), `step ${i} pose valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].coins && !!STEPS[1].coins, 'the coins arrive at step 2');
check(JSON.stringify(STEPS[0].pose) === JSON.stringify([2, 3, 3, 4]), 'the story opens on 2/3 ÷ 3/4');
/* answer keys derived from the model */
check(/^A count of fits/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: still a count');
check(/^8 ÷ 9 — a count divided by a count/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the coin cancels');
check(/^6 — six eighths/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: even landing');
check(/^a\/b × d\/c — invert-and-multiply is the exchange/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the unmasking');
check(/^6 — a tiny divisor fits many times/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: division grows');
/* the real beliefs are offered and refuted */
check(/multiply straight across/.test(STEPS.map((s) => (s.choices || []).join('|')).join('|')), 'the straight-across belief is offered');
check(/division always shrinks/.test(STEPS[4].choices.join('|')), 'the shrink belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted divisions');
check(CASES.some((q) => quotientOf(q).d === 1) && CASES.some((q) => quotientOf(q).d > 1), 'both whole and partial fits are posted');
for (let i = 0; i < CASES.length; i++) {
  const cChips = countsChips(i);
  const qChips = quotientChips(i);
  const cT = countsText(i);
  const qT = quotientTruth(i);
  check(cChips.length === 4 && new Set(cChips).size === 4, `case ${i}: four distinct count chips`);
  check(qChips.length === 4 && new Set(qChips).size === 4, `case ${i}: four distinct quotient chips`);
  check(cChips.includes(cT), `case ${i}: the counts truth is on a chip`);
  check(qChips.includes(qT), `case ${i}: the quotient truth is on a chip`);
  /* first principles */
  const [a, b, c, d] = CASES[i];
  const g = myGcd(a * d, b * c);
  check(qT === (b * c) / g === 1 ? String((a * d) / g) : qT === `${(a * d) / g}/${(b * c) / g}` || qT === String((a * d) / g), `case ${i}: quotient truth from first principles`);
  for (const cp of [null, ...cChips, 'bogus']) {
    for (const qp of [null, ...qChips]) {
      const should = cp === cT && qp === qT;
      check(isCalibrated(i, cp, qp) === should, `gate: case ${i} counts=${cp} q=${qp}`);
      check([0, 50, 100].includes(closeness(i, cp, qp)), 'meter quantized');
    }
  }
  const wrongC = cChips.find((x) => x !== cT);
  check(closeness(i, wrongC, qT) === 0, `case ${i}: the quotient without the counts earns nothing`);
}
check(calibChecks(null, 'x', 'y').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bsticks?\b|\bribbons?\b|\btick\b/i, 'no stick, no ribbon, no tick (UnitFractionDivisionLab)'],
  [/equal[- ]groups|\barray\b|\bsharing\b|\bshare\b/i, 'no equal-groups sharing (DivisionLab / FractionAsDivisionLab)'],
  [/\bflip\b|\bflips\b|\bflipped\b/i, 'no flip — invert, with receipts (SignedNumbersLab owns the word)'],
  [/\bpercent/i, 'no percent (PercentageLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const quotientOf = \(q\) => \{/.test(code), 'the quotient divides the counts');
check(/const countsOf = \(\[a, b, c, d\]\) => \{/.test(code), 'the counts come from the exchange');
check(/const invertMultiply = \(\[a, b, c, d\]\) => frac\(a \* d, b \* c\)/.test(code), 'the rule is stated independently and proven equal');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/quotient|answer|truth/i.test(block), 'no case ships its own quotient');
}
/* the drawing reads the model */
check(/countsOf\(S\.pose\)/.test(code), 'the coin rows read the model');
check(/quotientOf\(S\.pose\)/.test(code), 'the fit verdict reads the model');
check(/countsChips\(kase\)/.test(code) && /quotientChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-fractiondivision: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
