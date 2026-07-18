/* ============================================================================
   audit-pi.mjs — numeric + structural proof for PiLab.jsx
   (7.G.B.4 · π as the shared ratio; C = πd = 2πr; A = πr² by the comb).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the ratio's invariance across every wheel, the comb's
   exact conservation, the chip distinctness, the stamp — grep-enforce the
   refusals.

   Run:  node audit-pi.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PiLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PiLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PARAMS, START, CALIB_STEP, circumferenceOf, areaOf, trackRatio,
            PI_DIGITS, sliceAngle, arcsDown, arcsUp, cLabel, aLabel, ORDER_DS, makeOrder,
            areaChips, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  PARAMS, START, CALIB_STEP, circumferenceOf, areaOf, trackRatio, PI_DIGITS, sliceAngle,
  arcsDown, arcsUp, cLabel, aLabel, ORDER_DS, makeOrder, areaChips, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

const EPS = 1e-12;
const dDial = PARAMS.find((p) => p.key === 'd');
const nDial = PARAMS.find((p) => p.key === 'n');
const rollDial = PARAMS.find((p) => p.key === 'roll');

/* ---------------------------------------------------------------------------
   2. THE RATIO — π, invariant across every wheel on the dial; the formulas
   are derived from it, never typed as decimals.
   ------------------------------------------------------------------------- */
check(rollDial.min === 0 && rollDial.max === 24, 'the roll dial spans exactly one turn in 24ths');
for (let d = dDial.min; d <= dDial.max; d += dDial.step) {
  check(Math.abs(trackRatio(d) - Math.PI) < EPS, `d=${d}: track ÷ diameter is π`);
  check(Math.abs(circumferenceOf(d) - d * Math.PI) < EPS, `d=${d}: C = πd`);
  check(Math.abs(circumferenceOf(d) - 2 * (d / 2) * Math.PI) < EPS, `d=${d}: C = 2πr`);
  check(Math.abs(areaOf(d) - Math.PI * (d / 2) * (d / 2)) < EPS, `d=${d}: A = πr²`);
  /* the invariance claim itself: every wheel, the same count */
  check(Math.abs(trackRatio(d) - trackRatio(dDial.min)) < EPS, `d=${d}: the count never budges`);
  check(cLabel(d) === `${d}π`, `d=${d}: C labelled symbolically`);
}
/* the digits the student sees are truly π's, and the leftover is truly π−3 */
check(PI_DIGITS === Math.PI.toFixed(5), 'the shown digits are π to 5 places');
check((Math.PI - 3).toFixed(5) === '0.14159', 'the leftover is π − 3 ≈ 0.14159');
check((2 * Math.PI).toFixed(2) === '6.28', 'the radius-stick count is 2π ≈ 6.28');

/* ---------------------------------------------------------------------------
   3. THE COMB — exact conservation and the exact arc budget.
   ------------------------------------------------------------------------- */
check(nDial.step === 2 && nDial.min % 2 === 0, 'the slice dial is even-only');
for (let n = nDial.min; n <= nDial.max; n += nDial.step) {
  check(Math.abs(sliceAngle(n) * n - 2 * Math.PI) < EPS, `n=${n}: slice angles sum to the full disc`);
  check(arcsDown(n) + arcsUp(n) === n, `n=${n}: every slice combed`);
  check(arcsDown(n) === n / 2 && arcsUp(n) === n / 2, `n=${n}: the rim splits half down, half up — πr each`);
  /* conservation, symbolically: n slices of area r²π/n sum to r²π */
  for (let d = dDial.min; d <= dDial.max; d += dDial.step) {
    const r = d / 2;
    const slice = (r * r * Math.PI) / n;
    check(Math.abs(slice * n - areaOf(d)) < EPS, `n=${n},d=${d}: the comb conserves the disc exactly`);
  }
  /* the informal limit is real: the slant angle θ/2 = π/n shrinks monotonically */
  if (n > nDial.min) check(sliceAngle(n) < sliceAngle(n - 2), `n=${n}: finer is straighter`);
}

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — dials unlock in order; scenes pinned; answer keys
   tied to the model's own numbers.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
check(rollDial.unlock === 1 && dDial.unlock === 2 && nDial.unlock === 4, 'roll, then size, then slices');
STEPS.forEach((s, i) => {
  check(!!s.demo, `step ${i} scene pinned`);
  if (s.demo.roll != null)
    check(s.demo.roll >= rollDial.min && s.demo.roll <= rollDial.max, `step ${i} roll in range`);
  if (s.demo.n != null) check(s.demo.n >= nDial.min && s.demo.n <= nDial.max && s.demo.n % 2 === 0, `step ${i} n legal`);
  if (i >= 4) check(!!s.comb, `step ${i} shows the comb`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
/* answer keys derived from the model */
check(/^A bit more than 3$/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the estimation moment');
check(
  new RegExp(`about ${(Math.PI - 3).toFixed(5)} of it`).test(STEPS[1].choices[STEPS[1].answer]),
  'step 2 key: the leftover is π − 3, to the digit'
);
check(/still exactly π of its own diameter-sticks/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the ratio');
check(
  new RegExp(`^2π ≈ ${(2 * Math.PI).toFixed(2)}`).test(STEPS[3].choices[STEPS[3].answer]),
  'step 4 key: 2π radius-sticks'
);
check(/^Exactly the same/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: conservation');
check(/^πr × r = πr²/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 key: the derived formula');
/* the 22/7 myth is offered as a distractor and refuted in the feedback */
check(/Exactly 1\/7 of a stick/.test(STEPS[1].choices.join('|')), 'the 22/7 belief is offered');
check(/22\/7 ≈ 3\.14286 is only a handy approximation/.test(STEPS[1].feedback), '…and refuted with its own digits');
check((22 / 7).toFixed(5) === '3.14286', 'the refutation digit-checks');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — build the wheel AND declare the area; the foils are the
   habitual wrongs and never collide with the truth.
   ------------------------------------------------------------------------- */
check(ORDER_DS.every((d) => d >= dDial.min && d <= dDial.max), 'orders reachable on the dial');
check(!ORDER_DS.includes(4), 'd = 4 excluded — its truth and circumference foil would collide');
for (const order of ORDER_DS) {
  const chips = areaChips(order);
  check(chips.length === 3 && chips.filter((c) => c.ok).length === 1, `d=${order}: three chips, one truth`);
  check(new Set(chips.map((c) => c.s)).size === chips.length, `d=${order}: chips pairwise distinct`);
  const truth = chips.find((c) => c.ok).s;
  check(truth === `${(order / 2) * (order / 2)}π`, `d=${order}: the true chip is (d/2)²π`);
  check(truth === aLabel(order), `d=${order}: the chip agrees with the readout label`);
  /* the gate */
  for (let d = dDial.min; d <= dDial.max; d += dDial.step) {
    for (const chip of chips) {
      const stamped = isCalibrated(order, d, chip.s);
      check(stamped === (d === order && chip.ok), `gate at order=${order}, d=${d}, chip=${chip.s}`);
      check([0, 50, 100].includes(closeness(order, d, chip.s)), 'meter quantized');
    }
    check(!isCalibrated(order, d, null), 'no declaration, no stamp');
  }
  check(closeness(order, order, null) === 50, `d=${order}: wheel alone is half the job`);
}
check(calibChecks(null, 6, '9π').every((c) => c === false), 'no order, no credit');
for (let i = 0; i < 200; i++) check(ORDER_DS.includes(makeOrder(null)), 'orders from the pool');
for (let i = 0; i < 100; i++) check(makeOrder(6) !== 6, 'a new order is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/unroll/i, 'the wheel ROLLS — no unrolling (CylinderLab)'],
  [/cut.and.slide|\bnotch\b|overhang/i, 'no cut-and-slide (AreaLab)'],
  [/unit square/i, 'no unit-square counting (AreaLab)'],
  [/wrapping|wrap(s|ped)? (a |the |around)|radian/i, 'no wrapping, no radians (UnitCircleLab)'],
  [/°|\bdegrees?\b/i, 'no degrees — slices are counted, not measured'],
  [/equation of (a|the) circle|\(x\s*−\s*h\)/i, 'no circle equation (CircleLab)'],
  [/π\s*=\s*3\.14/, 'π is never equated to a decimal — ≈ only'],
  [/π\s*=\s*22\/7/, 'π is never equated to 22/7'],
  [/\b3\.14\b/, 'the two-digit habit never appears alone'],
  [/ctx\.scale\(/, 'the comb never scales a slice — rotation and translation only'],
  [/requestAnimationFrame/, 'nothing animates — rolling is dragged, not played'],
  [/numerator|denominator/i, 'no fraction vocabulary (FractionLab)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* π enters as the constant only */
check(/const circumferenceOf = \(d\) => d \* Math\.PI;/.test(code), 'C computed from Math.PI');
check(/const areaOf = \(d\) => \(d \/ 2\) \* \(d \/ 2\) \* Math\.PI;/.test(code), 'A computed from Math.PI');
check(!/3\.14159265/.test(code), 'no hand-typed long π');
/* every shown 3.14159 outside the one PI_DIGITS constant wears an ≈ */
{
  const total = (code.match(/3\.14159/g) || []).length;
  const approx = (code.match(/≈ 3\.14159/g) || []).length;
  check(total - approx === 1, 'the digits appear bare exactly once — the PI_DIGITS constant');
}
/* honesty markers */
check(/≈/.test(code), 'approximations are marked ≈');
check(/never settle|never settles/i.test(code), 'the non-terminating nature is stated');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-pi: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
