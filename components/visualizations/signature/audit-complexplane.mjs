/* ============================================================================
   audit-complexplane.mjs — numeric + structural proof for ComplexPlaneLab.jsx
   (N-CN.A.1–2, C.7 · ×i is a quarter-turn; i² = −1; the closed shop).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact — the quarter-turn laws over the whole Gaussian grid
   (agreement of ×i with the general product, four-press return, exact
   perpendicularity, exact length² preservation), the power cycle out to
   m = 100, the quadratic check by direct substitution, every quoted
   landing, the stamp — and grep-enforce the refusals (no trig, no sqrt,
   anywhere in the file).

   Run:  node audit-complexplane.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ComplexPlaneLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ComplexPlaneLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const codeSansCss = code.replace(/<style jsx>\{`[\s\S]*?`\}<\/style>/, '');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, PRESS_MAX, CALIB_STEP, mulI, mulC, addC, rotK, powI,
            len2, dot, fmtSignedC, fmtC, ARMS, CASES, makeCase, armTruth, armChips,
            POWER_CHIPS, powTruth, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  PRESS_MAX, CALIB_STEP, mulI, mulC, addC, rotK, powI, len2, dot, fmtC, ARMS, CASES,
  makeCase, armTruth, armChips, POWER_CHIPS, powTruth, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

const eqC = (z, w) => z.re === w.re && z.im === w.im;
const I = { re: 0, im: 1 };

/* ---------------------------------------------------------------------------
   2. THE QUARTER-TURN LAWS — over the whole Gaussian grid.
   ------------------------------------------------------------------------- */
check(eqC(mulC(I, I), { re: -1, im: 0 }), 'i² = −1, by the general product');
check(eqC(powI(2), { re: -1, im: 0 }) && eqC(powI(4), { re: 1, im: 0 }), 'i² = −1 and i⁴ = 1, by presses');
for (let a = -5; a <= 5; a++) {
  for (let b = -5; b <= 5; b++) {
    const z = { re: a, im: b };
    check(eqC(mulI(z), mulC(z, I)), `z=${a},${b}: ×i agrees with the general product`);
    check(eqC(rotK(z, 4), z), `z=${a},${b}: four presses come home`);
    check(eqC(rotK(z, 8), z), `z=${a},${b}: eight presses come home too`);
    if (a !== 0 || b !== 0) check(dot(z, mulI(z)) === 0, `z=${a},${b}: the press lands perpendicular`);
    check(len2(mulI(z)) === len2(z), `z=${a},${b}: length² kept exactly`);
    check(eqC(mulC(z, { re: 1, im: 0 }), z), `z=${a},${b}: ×1 is the identity`);
  }
}
/* the general product is honest algebra: commutative, distributive (sampled) */
const SAMPLE = [
  { re: 2, im: 1 }, { re: -1, im: 3 }, { re: 0, im: -2 }, { re: 4, im: 0 }, { re: -3, im: -3 },
];
for (const z of SAMPLE)
  for (const w of SAMPLE) {
    check(eqC(mulC(z, w), mulC(w, z)), 'the product commutes');
    for (const u of SAMPLE)
      check(eqC(mulC(z, addC(w, u)), addC(mulC(z, w), mulC(z, u))), 'the product distributes');
  }

/* ---------------------------------------------------------------------------
   3. THE POWER CYCLE — out to m = 100, by remainder.
   ------------------------------------------------------------------------- */
const CYCLE = ['1', 'i', '−1', '−i'];
for (let m = 0; m <= 100; m++) {
  check(fmtC(powI(m)) === CYCLE[m % 4], `i^${m} follows the remainder`);
}
check(fmtC(powI(26)) === '−1', 'i²⁶ = −1');
check(26 === 4 * 6 + 2, 'twenty-six is six trips plus two');

/* ---------------------------------------------------------------------------
   4. THE QUOTED FACTS — recomputed, including the quadratic check.
   ------------------------------------------------------------------------- */
check(fmtC(mulI({ re: 2, im: 1 })) === '−1 + 2i', '(2 + i)·i = −1 + 2i');
check(len2({ re: 2, im: 1 }) === 5 && len2({ re: -1, im: 2 }) === 5, 'both arms carry length² = 5');
check(dot({ re: 2, im: 1 }, { re: -1, im: 2 }) === 0, 'the two addresses are perpendicular');
/* x² − 2x + 5 at x = 1 ± 2i, by exact substitution */
for (const root of [{ re: 1, im: 2 }, { re: 1, im: -2 }]) {
  const value = addC(addC(mulC(root, root), mulC({ re: -2, im: 0 }, root)), { re: 5, im: 0 });
  check(eqC(value, { re: 0, im: 0 }), `x = ${fmtC(root)} solves x² − 2x + 5 = 0, exactly`);
}
check(eqC(mulC({ re: 1, im: 2 }, { re: 1, im: 2 }), { re: -3, im: 4 }), '(1 + 2i)² = −3 + 4i');
/* x² + 1 = 0 at ±i */
for (const root of [I, { re: 0, im: -1 }])
  check(eqC(addC(mulC(root, root), { re: 1, im: 0 }), { re: 0, im: 0 }), `x = ${fmtC(root)} solves x² + 1 = 0`);
/* format spot checks */
check(fmtC({ re: 0, im: 1 }) === 'i' && fmtC({ re: 0, im: -1 }) === '−i', 'the unit arms format cleanly');
check(fmtC({ re: 2, im: 1 }) === '2 + i' && fmtC({ re: 1, im: -3 }) === '1 − 3i', 'signs and unit coefficients');
check(fmtC({ re: 0, im: 2 }) === '2i' && fmtC({ re: -1, im: 0 }) === '−1', 'pure parts format cleanly');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(Number.isInteger(s.arm.re) && Number.isInteger(s.arm.im), `step ${i} arm is a Gaussian integer`);
  check(Number.isInteger(s.presses) && s.presses >= 0 && s.presses <= PRESS_MAX, `step ${i} presses valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(eqC(STEPS[1].arm, { re: 1, im: 0 }) && eqC(STEPS[3].arm, { re: 2, im: 1 }), 'the machine loads 1, then 2 + i');
check(!!STEPS[1].dial && !!STEPS[2].dial && !STEPS[0].dial, 'the press counter unlocks at step 2');
check(!!STEPS[4].roots, 'the closed shop shows the root pair');
/* answer keys derived from the model */
check(/^\(3, 2\) — three along the real floor/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the address');
check(/^−1 — a quarter-turn twice is the half-turn/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: i² = −1');
check(/^−1 — twenty-six presses/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the remainder');
check(/^−1 \+ 2i — the arm turns a quarter/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the landing');
check(/^Substitute and compute with i² = −1/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the check');
/* the real beliefs are offered and refuted */
check(/2i — i times i doubles it/.test(STEPS[1].choices.join('|')), 'the doubling belief is offered');
check(/even powers are always positive/.test(STEPS[2].choices.join('|')), 'the even-power belief is offered');
check(/imaginary means invented/.test(STEPS[0].choices.join('|')), 'the invented belief is offered');
/* the siblings are cited without their devices */
check(/signed-numbers bench/.test(STEPS[1].feedback), 'the half-turn sibling is cited');
check(/quadratic bench/.test(STEPS[4].body), 'the quadratic bench’s unfinished case is cited');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted courses');
for (let i = 0; i < CASES.length; i++) {
  const { z, k, m } = CASES[i];
  const chips = armChips(i);
  const aT = armTruth(i);
  const pT = powTruth(i);
  check(chips.length === 4 && new Set(chips).size === 4, `case ${i}: the four quarter-positions are distinct chips`);
  check(chips.includes(aT), `case ${i}: the landing truth is on a chip`);
  check([...chips].sort().join('|') === chips.join('|'), `case ${i}: chips deterministically ordered`);
  check(POWER_CHIPS.includes(pT), `case ${i}: the power truth is a chip`);
  /* first principles: press k times by hand */
  let hand = ARMS[z];
  for (let j = 0; j < k; j++) hand = { re: -hand.im, im: hand.re };
  check(fmtC(hand) === aT, `case ${i}: the landing is k presses from first principles`);
  check(pT === CYCLE[m % 4], `case ${i}: the lonely power follows the remainder`);
  for (const ap of [null, ...chips, 'bogus']) {
    for (const pp of [null, ...POWER_CHIPS]) {
      const should = ap === aT && pp === pT;
      check(isCalibrated(i, ap, pp) === should, `gate: case ${i} arm=${ap} pow=${pp}`);
      check([0, 50, 100].includes(closeness(i, ap, pp)), 'meter quantized');
    }
  }
  const wrongArm = chips.find((x) => x !== aT);
  check(closeness(i, wrongArm, pT) === 0, `case ${i}: the power without the landing earns nothing`);
}
check(calibChecks(null, '2 + i', '1').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const kk = makeCase(null);
  check(Number.isInteger(kk) && kk >= 0 && kk < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(3) !== 3, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/Math\.(sin|cos|tan|atan|sqrt)/, 'no trig, no square roots — even the renderer is integer-fed', code],
  [/\bradians?\b|wrapping|unwrap/i, 'no radian, no wrapping (UnitCircleLab)', code],
  [/\brotations?\b|rigid motion/i, 'the turn is never named as a rigid motion (TransformationsLab)', codeSansCss],
  [/\bflips?\b|parity|\bsheet\b/i, 'no flips, no parity (SignedNumbersLab; its bench is cited by name)', code],
  [/\bmirror/i, 'no mirror (IntegerLab)', code],
  [/\bmarch/i, 'no arrow marches (SignedAdditionLab)', code],
  [/\bwave\b|amplitude|\bperiod\b/i, 'no wave machinery (the circular-function labs)', code],
  [/completing the square/i, 'no completing the square (QuadraticEquationLab)', code],
  [/\bslope\b/i, 'no slope talk (LineFunctionLab)', code],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)', code],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)', code],
  [/mason|packing|leftover/i, 'no rearrangement machinery (PythagorasLab)', code],
  [/requestAnimationFrame/, 'nothing animates — the press counter is a dial', code],
];
for (const [re, why, hay] of forbid) check(!re.test(hay), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const mulI = \(z\) => \(\{ re: -z\.im, im: z\.re \}\)/.test(code), '×i is the exact coordinate map');
check(/const mulC = \(z, w\) => \(\{/.test(code), 'the general product is exact FOIL');
check(/const powI = \(m\) => rotK\(\{ re: 1, im: 0 \}, m\)/.test(code), 'powers of i are pressed, not stored');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/truth|land|answer/i.test(block), 'no case ships its own landing');
}
/* the drawing reads the model */
check(/rotK\(S\.z, S\.k\)/.test(code), 'the arm reads the model');
check(/armChips\(kase\)/.test(code), 'the stamp chips come from the model');
check(/len2\(rotK|len2\(zNow\)/.test(code), 'the length² readout reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-complexplane: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
