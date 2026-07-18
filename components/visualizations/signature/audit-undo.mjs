/* ============================================================================
   audit-undo.mjs — numeric proof for UndoLab.jsx
   (HSF-BF.B.4 · the undo machine; socks and shoes, run backward).

   Run:  node audit-undo.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./UndoLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function UndoLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, fmtInt, fwdStages, fwdOf, invStages,
            invOf, wrongOrder, sq, pipeText, undoText, CASES, F_CHIPS, INV_CHIPS,
            labelOf, fTruth, invTruth, makeCase, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, fwdStages, fwdOf, invStages, invOf, wrongOrder, sq, pipeText,
  undoText, CASES, F_CHIPS, INV_CHIPS, labelOf, fTruth, invTruth, makeCase,
  calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE MACHINE'S LAWS — round trips, stage order, the jumbler.
   ------------------------------------------------------------------------- */
for (let a = 2; a <= 6; a++)
  for (let b = -6; b <= 6; b++) {
    /* both round trips, across many inputs */
    for (let x = -8; x <= 8; x++) {
      const y = fwdOf(a, b, x);
      check(invOf(a, b, y) === x, `inv(fwd(${x})) = ${x} for (${a},${b})`);
      /* the stage stations agree in reverse */
      const f = fwdStages(a, b, x);
      const u = invStages(a, b, y);
      check(u[0] === f[2] && u[1] === f[1] && u[2] === f[0], `the conveyors share stations (${a},${b},${x})`);
    }
    /* fwd(inv(y)) = y wherever inv is defined */
    for (let x = -5; x <= 5; x++) {
      const y = a * x + b;
      check(fwdOf(a, b, invOf(a, b, y)) === y, `fwd(inv(${y})) = ${y} for (${a},${b})`);
    }
    /* wrong order (÷a then −b) gives y/a − b = x + b/a − b: it agrees with
       the true undo exactly when b = 0 — the shift is what the order protects */
    const y0 = fwdOf(a, b, 5);
    const wrong = wrongOrder(a, b, y0);
    if (wrong !== null) {
      check((wrong === 5) === (b === 0), `the orders coincide exactly when b = 0 (${a},${b})`);
    }
    /* undo of an off-lattice target refuses */
    let threw = false;
    try {
      invOf(a, b, fwdOf(a, b, 5) + 1);
    } catch {
      threw = true;
    }
    if ((fwdOf(a, b, 5) + 1 - b) % a !== 0) check(threw, `off-lattice targets refuse (${a},${b})`);
  }
/* the lesson's fixed pipeline */
check(fwdStages(2, 3, 5).join(',') === '5,10,13', 'the forward stations 5, 10, 13');
check(invStages(2, 3, 13).join(',') === '13,10,5', 'the undo stations 13, 10, 5');
check(pipeText(2, 3) === '×2, then + 3' && undoText(2, 3) === `− 3, then ÷2`, 'the stage texts');
/* the jumbler: the collision and its consequence */
check(sq(3) === 9 && sq(-3) === 9, 'the collision: 3 and −3 both land on 9');
check(sq(3) === sq(-3) && 3 !== -3, 'two inputs, one output — no function can split it');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/5 → 10 → 13/.test(STEPS[0].body), 'step 1 runs the stations');
check(/13 → 10 → 5/.test(STEPS[1].body), 'step 2 runs them back');
check(/13\/2/.test(STEPS[1].feedback), 'the wrong order is exhibited');
check(/\(y − 3\)\/2/.test(STEPS[2].q) || /\(y − 3\)\/2/.test(STEPS[2].body), 'step 3 writes the undo');
check(/f⁻¹\(f\(x\)\) = x and f\(f⁻¹\(y\)\) = y/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the matched pair');
check(/Feed 3 → 9\. Feed −3 → 9/.test(STEPS[3].body), 'step 4 posts the collision');
check(/√9 = 3/.test(STEPS[3].feedback), 'the smuggled choice is named');
check(/arcsin bench/.test(STEPS[3].note), 'the window repair is cited');
check(/logarithm bench|bench next door/.test(STEPS[2].note), 'the mirror is ceded');
check(/a = 0/.test(STEPS[4].note), 'the ultimate jumbler is named');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(['fwd', 'both', 'jumble'].includes(s.mode), `step ${i} mode valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].mode === 'fwd' && STEPS[3].mode === 'jumble' && !!STEPS[4].dial, 'the mode ladder; the dial shifts b');
/* answer keys */
check(/^The formula became a SEQUENCE/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key');
check(/^The last stage applied is the outermost wrapper/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key');
check(/^Both round trips/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key');
check(/^No — an undo machine receiving 9/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key');
check(/^The round trip: 5/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key');
check(/Order doesn’t matter/.test(STEPS[1].choices.join('|')), 'the order-blind belief is offered');
check(/just take the square root/.test(STEPS[3].choices.join('|')), 'the root-fixes-it belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted pipelines');
const fsPosted = new Set(CASES.map((_, i) => fTruth(i)));
const invsPosted = new Set(CASES.map((_, i) => invTruth(i)));
check(F_CHIPS.every((f) => fsPosted.has(f)), 'every forward chip is some case’s truth');
check(INV_CHIPS.every((v) => invsPosted.has(v)), 'every undo chip is some case’s truth');
/* several cases share the undo truth 3 with different pipelines */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && invTruth(i) === invTruth(j) && fTruth(i) !== fTruth(j))),
  'two cases share an undo but not a forward run'
);
for (let i = 0; i < CASES.length; i++) {
  const fT = fTruth(i);
  const vT = invTruth(i);
  check(F_CHIPS.includes(fT) && INV_CHIPS.includes(vT), `case ${i}: truths are chips`);
  const { a, b, k } = CASES[i];
  check(fT === String(a * 5 + b), `case ${i}: forward from first principles`);
  check((k - b) % a === 0 && vT === String((k - b) / a), `case ${i}: the target undoes to an integer`);
  for (const fp of [null, ...F_CHIPS, 'bogus']) {
    for (const vp of [null, ...INV_CHIPS]) {
      const should = fp === fT && vp === vT;
      check(isCalibrated(i, fp, vp) === should, `gate: case ${i} f=${fp} v=${vp}`);
      check([0, 50, 100].includes(closeness(i, fp, vp)), 'meter quantized');
    }
  }
  const wrongF = F_CHIPS.find((x) => x !== fT);
  check(closeness(i, wrongF, vT) === 0, `case ${i}: the undo without the forward run earns nothing`);
  check(labelOf(i).includes(String(CASES[i].k)), `case ${i}: label posts the target`);
}
check(calibChecks(null, '13', '3').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/y = x\b|mirror line|reflect/i, 'no mirror (LogarithmLab)'],
  [/\bwindows?\b(?!\.)|spokesperson|\broster\b/i, 'no window machinery (ArcsinLab; the repair is cited by bench name)'],
  [/one-way gate|checkpoint|intruder/i, 'no gate machinery (ExtraneousLab)'],
  [/moves the grid|area bill|\bcolumns?\b/i, 'no plane machinery (MatrixLab)'],
  [/\bbalance\b|two-pan|\bscale\b/i, 'no balance imagery (EquationLab)'],
  [/\bgraphs?\b|\bcurves?\b/i, 'no graph at all — that is the point'],
  [/census|constraint kit/i, 'no kit machinery'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|sin|acos)/, 'no float math'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/if \(\(y - b\) % a !== 0\) throw/.test(code), 'the integer-undo law is asserted');
check(/const invOf = \(a, b, y\) => invStages\(a, b, y\)\[2\]/.test(code), 'the undo rides the stations');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/fwd|inv|truth|answer/i.test(block), 'no case ships its own runs');
}
/* the drawing reads the model */
check(/invStages\(S\.a, S\.b, S\.target\)/.test(code), 'the undo conveyor computes live');
check(/S\.calib \? \[5, null, null\]/.test(code), 'the capstone veils the stations');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-undo: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
