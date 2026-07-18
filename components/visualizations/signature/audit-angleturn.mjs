/* ============================================================================
   audit-angleturn.mjs — numeric + structural proof for AngleTurnLab.jsx
   (4.MD.C.5–7 · the degree sliver, stacked sweeps, the missing part).

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — additivity, the
       gate at 180, the sliver identity, the fraction names, the missing
       part, and the stamp gate a + b === T.
     • Enforce the lab's REFUSALS (no radians, no arc length, no coordinate
       grid, no invariance demos, no square-corner test, no clock) by
       grepping the code below the header.

   Run:  node audit-angleturn.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./AngleTurnLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function AngleTurnLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src
  .slice(headerEnd)
  .replace(/prefers-reduced-motion: reduce/g, 'prefers-rm')
  .replace(/transform: rotate\(-3deg\);/g, 'transform: tilt;');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, clamp5, totalOf,
            canSecondSweep, secondMax, missingPart, sliverCount, FULL_TURN, fracName,
            makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, clamp5, totalOf,
  canSecondSweep, secondMax, missingPart, sliverCount, FULL_TURN, fracName,
  makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. ADDITIVITY AND THE GATE — sweeps stack; the whole stays on the scale.
   ------------------------------------------------------------------------- */
for (let a = 0; a <= 180; a += 5)
  for (let b = 0; b <= 180; b += 5) {
    check(totalOf(a, b) === a + b, `parts add at ${a}+${b}`);
    check(canSecondSweep(a, b) === (a + b <= 180), `gate at ${a}+${b}`);
  }
for (let a = 0; a <= 180; a += 5) {
  check(secondMax(a) === 180 - a, `second sweep max at a=${a}`);
  check(canSecondSweep(a, secondMax(a)), 'the max itself is allowed');
  check(!canSecondSweep(a, secondMax(a) + 5), 'one click past the max is not');
}
/* clamp5 lands on fives, inside the rails */
for (let v = -20; v <= 200; v += 1) {
  const c = clamp5(v, 0, 180);
  check(c % 5 === 0 && c >= 0 && c <= 180, `clamp5 at ${v}`);
}

/* ---------------------------------------------------------------------------
   3. THE SLIVER IDENTITY AND THE NAMES — 4.MD.C.5 exactly.
   ------------------------------------------------------------------------- */
check(FULL_TURN === 360, 'the full turn is 360 slivers');
for (let d = 0; d <= 360; d += 5) check(sliverCount(d) === d, `n degrees is n slivers at ${d}`);
check(fracName(90) === 'a quarter turn', '90 is the quarter');
check(fracName(180) === 'a half turn', '180 is the half');
for (let d = 0; d <= 180; d += 5) {
  if (d !== 90 && d !== 180) check(fracName(d) === null, `no name at ${d}`);
}
/* the quarter really is a quarter: 90/360 = 1/4 by cross products */
check(90 * 4 === 360 * 1, 'quarter cross-check');
check(180 * 2 === 360 * 1, 'half cross-check');

/* ---------------------------------------------------------------------------
   4. THE MISSING PART — subtraction, and always reachable.
   ------------------------------------------------------------------------- */
check(missingPart(90, 35) === 55, 'the lesson case: 90 − 35 = 55');
for (let T = 60; T <= 180; T += 5)
  for (let A = 15; A <= T - 15; A += 5) {
    const m = missingPart(T, A);
    check(A + m === T, `parts rebuild the whole at T=${T}, A=${A}`);
    check(m >= 15 && m <= 180 && m % 5 === 0, `missing part on the dial at T=${T}, A=${A}`);
    check(m <= secondMax(A), `missing part inside the gate at T=${T}, A=${A}`);
  }

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes,
   the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
check(STEPS.length === 7, 'seven steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  const dm = s.demo;
  check(dm && dm.a % 5 === 0 && dm.b % 5 === 0 && dm.a + dm.b <= 180, `step ${i} demo on the dial and inside the gate`);
});
check(/amount of turn/i.test(STEPS[0].choices[STEPS[0].answer]), 'step 1: measure is turn');
check(STEPS[0].choices.some((c) => /distance between the two ray tips/i.test(c)), 'step 1 offers the tips error');
check(STEPS[1].lens && STEPS[1].lens.slivers === true, 'step 2 shows the sliver circle');
check(/quarter of the full turn/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2: 90 slivers = a quarter');
check(/180°/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3: half turn is 180');
check(STEPS[3].demo.a === 40 && STEPS[3].demo.b === 25 && totalOf(40, 25) === 65, 'step 4 scene: 40 + 25');
check(/65°/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer is 65');
check(STEPS[4].lens && STEPS[4].lens.protractor === true, 'step 5 swings in the protractor');
check(totalOf(STEPS[4].demo.a, STEPS[4].demo.b) === 115, 'step 5 needle reads 115');
check(/circle-fraction scale/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5: the protractor counts slivers');
check(STEPS[5].lens && STEPS[5].lens.frame === 90, 'step 6 frames the right angle');
check(STEPS[5].demo.a === 35 && STEPS[5].demo.b === missingPart(90, 35), 'step 6 scene shows 35 + 55');
check(/55°/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6 answer is 55');
check(STEPS[5].choices.some((c) => /parts must be equal/.test(c)), 'step 6 offers the equal-parts myth');

/* dials: two sweeps; the second arrives with additivity */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'first').unlock === 0 && DIALS.find((d) => d.key === 'second').unlock === 3, 'second sweep unlocks at the stacking step');
check(DIALS.every((d) => d.min === 0 && d.max === 180), 'sweeps run 0–180');

/* ---------------------------------------------------------------------------
   6. CALIBRATION — the stamp is the integer identity a + b === T; the meter
   reads 100 nowhere else; every posted whole is reachable.
   ------------------------------------------------------------------------- */
for (let T = 60; T <= 180; T += 5) {
  for (let total = 0; total <= 360; total += 5) {
    check(isCalibrated(total, T) === (total === T), `stamp ⟺ equality at ${total} vs ${T}`);
    const m = closeness(total, T);
    check(m >= 0 && m <= 100, 'meter in range');
    check((m === 100) === (total === T), `meter 100 ⟺ filled at ${total} vs ${T}`);
  }
  for (let t = 0; t < T; t += 5) check(closeness(t + 5, T) >= closeness(t, T), `meter monotone below T=${T}`);
  for (let t = 360; t > T; t -= 5) check(closeness(t - 5, T) >= closeness(t, T), `meter monotone above T=${T}`);
}
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.T % 5 === 0 && t.T >= 60 && t.T <= 180, 'posted whole on the dial, 60–180');
  check(t.A % 5 === 0 && t.A >= 15 && t.A <= t.T - 15, 'pinned part leaves a real remainder');
  const need = missingPart(t.T, t.A);
  check(need >= 15 && need <= secondMax(t.A), `the remainder ${need} is reachable`);
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ T: 90, A: 35 });
  check(!(t.T === 90 && t.A === 35), 'a new whole is genuinely new');
}

/* ---------------------------------------------------------------------------
   7. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/radians?\b|s ?= ?r|arc.?length/i, 'no radians, no arc length (AngleLab)'],
  [/coordinates?|x-axis|y-axis|quadrant|standard position/i, 'no coordinate grid (AngleLab/PointLab)'],
  [/invarian/i, 'no invariance demo (AngleLab owns it)'],
  [/square.?corner/i, 'no corner-fit test (LinesRaysSegmentsLab owns naming)'],
  [/\bclock\b|o'clock|\bhours?\b/i, 'no clock face (TimeLab)'],
  [/split (dial|slider)|shade|partition dial/i, 'no partition device (FractionLab)'],
  [/\bfold\b|mirror|symmetr/i, 'no folding (SymmetryLab)'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/requestAnimationFrame/, 'nothing animates — the sweep is dial-driven'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the second sweep is gated by the model, never clamped */
check(/setB\(clamp5\(raw, 0, secondMax\(a\)\)\)/.test(code), 'the second dial obeys the gate');
check(/setB\(\(v\) => Math\.min\(v, secondMax\(na\)\)\)/.test(code), 'shrinking the first sweep re-gates the second');
/* the first sweep is pinned in the capstone */
check(/calib && dl\.key === 'first'/.test(code), 'the first part is pinned in the capstone');
/* the blue arc starts where the carmine arc ends — additivity drawn */
check(/-tot \* RAD, -S\.a \* RAD/.test(code), 'the second arc starts at the first arc’s end');
/* the readout writes the sum from the model */
check(/`\$\{S\.a\}° \+ \$\{S\.b\}° = \$\{tot\}°`/.test(code), 'the say band writes the sum');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-angleturn: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
