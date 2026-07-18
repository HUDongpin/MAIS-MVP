/* ============================================================================
   audit-gramsandliters.mjs — numeric + structural proof for
   GramsAndLitersLab.jsx (3.MD.A.2 · mass and liquid volume — "the needle
   and the waterline").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the tick
       arithmetic, the pour/lift gates, the one-step reading identity, the
       benchmark facts, and the stamp gate base + pour === order.
     • Enforce the lab's REFUSALS (no two-sided balance, no rods or rulers,
       no unit cubes, no conversion device, no coins) by grepping the code
       below the header.

   Run:  node audit-gramsandliters.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./GramsAndLitersLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function GramsAndLitersLab');
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
   return { CARMINE, BLUE, GOLD, DIALS, CALIB_STEP, clampInt, clamp25, GRAMS_IN_KG,
            ML_IN_LITER, LABEL_EVERY, TICK_EVERY, labelBelow, ticksPast, readingOf,
            canPour, pourMax, canLift, liftMax, PILLOW, BRICK, TALL_JUG, WIDE_JUG, MUL,
            makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, clamp25, GRAMS_IN_KG,
  ML_IN_LITER, LABEL_EVERY, TICK_EVERY, labelBelow, ticksPast, readingOf,
  canPour, pourMax, canLift, liftMax, PILLOW, BRICK, TALL_JUG, WIDE_JUG, MUL,
  makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE BENCHMARK FACTS AND THE TICK ARITHMETIC.
   ------------------------------------------------------------------------- */
check(GRAMS_IN_KG === 1000, 'a kilogram is 1000 grams');
check(ML_IN_LITER === 1000, 'a liter is 1000 milliliters');
check(LABEL_EVERY === 200 && TICK_EVERY === 50, 'labels every 200, ticks every 50');
for (let r = 0; r <= 1000; r += 25) {
  const lb = labelBelow(r);
  check(lb % LABEL_EVERY === 0 && lb <= r && r - lb < LABEL_EVERY, `label below at ${r}`);
  if (r % 50 === 0) {
    const t = ticksPast(r);
    check(Number.isInteger(t) && t >= 0 && t <= 3, `ticks past at ${r}`);
    check(lb + t * TICK_EVERY === r, `label + ticks rebuilds the reading at ${r}`);
  }
}
check(labelBelow(500) === 400 && ticksPast(500) === 2, 'the lesson case: 500 is 400 + 2 ticks');
check(labelBelow(650) === 600 && ticksPast(650) === 1, 'the beaker case: 650 is 600 + 1 line');

/* ---------------------------------------------------------------------------
   3. THE ONE-STEP READINGS — pouring adds, lifting subtracts, gates hold.
   ------------------------------------------------------------------------- */
for (let base = 0; base <= 1000; base += 25) {
  check(pourMax(base) === 1000 - base, `pour max at ${base}`);
  check(liftMax(base) === base, `lift max at ${base}`);
  for (let chg = 0; chg <= 500; chg += 25) {
    check(canPour(base, chg) === (base + chg <= 1000), `pour gate at ${base}+${chg}`);
    check(canLift(base, chg) === (chg <= base), `lift gate at ${base}−${chg}`);
    if (canPour(base, chg)) check(readingOf(base, chg, 1) === base + chg, `pour reading at ${base}+${chg}`);
    if (canLift(base, chg)) {
      const r = readingOf(base, chg, -1);
      check(r === base - chg && r >= 0, `lift reading at ${base}−${chg}`);
    }
  }
}
check(readingOf(375, 250, 1) === 625, 'the pour lesson: 375 + 250 = 625');
check(readingOf(800, 150, -1) === 650, 'the box trick: 800 − 150 = 650');

/* the perception traps are real inversions of the shipped constants */
check(PILLOW.w * PILLOW.h > BRICK.w * BRICK.h, 'the pillow is drawn strictly bigger than the brick');
check(PILLOW.g < BRICK.g, '…and weighs strictly less — big is not heavy');
check(BRICK.g - PILLOW.g === 400, 'the trap reveal quotes the true 400 g gap');
check(PILLOW.g % 25 === 0 && BRICK.g % 25 === 0, 'both trap readings land on the ticks');
check(TALL_JUG.h > WIDE_JUG.h, 'the tall jug is drawn strictly taller than the wide one');
check(TALL_JUG.mL < WIDE_JUG.mL, '…and holds strictly less — tall is not more');
check(TALL_JUG.mL % 25 === 0 && WIDE_JUG.mL % 25 === 0 && WIDE_JUG.mL <= 1000, 'both jug readings fit the beaker ticks');

/* repeated pouring multiplies — and stays inside the beaker */
check(MUL.n * MUL.cup === 750, 'three mugs of 250 reach exactly 750');
check(MUL.n * MUL.cup <= 1000 && (MUL.n + 1) * MUL.cup === 1000, 'a fourth mug lands exactly on the brim, as the reveal claims');
for (let k = 1; k <= MUL.n; k++) {
  check(readingOf((k - 1) * MUL.cup, MUL.cup, 1) === k * MUL.cup, `pour ${k} climbs the same ${MUL.cup} step`);
}

/* clamp25 lands on 25s, inside the rails */
for (let v = -50; v <= 1100; v += 7) {
  const c = clamp25(v, 0, 1000);
  check(c % 25 === 0 && c >= 0 && c <= 1000, `clamp25 at ${v}`);
}

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes
   with their instruments, the wrong answers are the real classroom errors.
   ------------------------------------------------------------------------- */
check(STEPS.length === 10, 'ten steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  check(s.mode === 'scale' || s.mode === 'beaker', `step ${i} names its instrument`);
  const dm = s.demo;
  check(dm && dm.amt % 25 === 0 && dm.amt >= 0 && dm.amt <= 1000, `step ${i} demo on the dial`);
});
check(STEPS.filter((s) => s.mode === 'scale').length === 4 && STEPS.filter((s) => s.mode === 'beaker').length === 5, 'the scale gets four steps, the beaker five');
check(STEPS[0].demo.amt === 500 && /500 g/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 reads 500');
check(STEPS[0].choices.some((c) => /420 g/.test(c)), 'step 1 offers the tick-is-1 error');
check(/60 g/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2: the egg is 60 g');
check(STEPS[3].demo.amt === 650 && /650 mL/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 reads 650');
check(STEPS[3].choices.some((c) => /601 mL/.test(c)), 'step 4 offers the line-is-1 error');
check(/150 L/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5: the bathtub is 150 L');
check(STEPS[6].dir === 1 && STEPS[6].demo.amt === 375 && STEPS[6].demo.chg === 250, 'step 7 pours 250 into 375');
check(/625 mL/.test(STEPS[6].choices[STEPS[6].answer]), 'step 7 answer is 625');
check(STEPS[8].dir === -1 && STEPS[8].demo.amt === 800 && STEPS[8].demo.chg === 150, 'step 9 lifts 150 off 800');
check(/650 g/.test(STEPS[8].choices[STEPS[8].answer]), 'step 9 answer is 650');
check(STEPS[8].choices.some((c) => /950 g/.test(c)), 'step 9 offers the add-instead error');

/* the merged trap and multiply steps sit where their instruments live */
check(!!STEPS[2].pillow && STEPS[2].mode === 'scale' && STEPS[2].demo.amt === PILLOW.g, 'step 3: the pillow trap, needle at the pillow’s true mass');
check(/brick/.test(STEPS[2].choices[STEPS[2].answer]) && /needle/.test(STEPS[2].choices[STEPS[2].answer]), 'the trap verdict cites the needle, not the size');
check(STEPS[2].choices.some((c) => /bigger is heavier/.test(c)), 'the eye’s error is on the table');
check(!!STEPS[5].jugs && STEPS[5].mode === 'beaker' && STEPS[5].demo.amt === WIDE_JUG.mL, 'step 6: the jug trap, waterline at the wide jug’s pour');
check(new RegExp(`${WIDE_JUG.mL} against ${TALL_JUG.mL}`).test(STEPS[5].choices[STEPS[5].answer]), 'the jug verdict reads both waterlines');
check(STEPS[5].choices.some((c) => /taller is more/.test(c)), 'the height error is on the table');
check(!!STEPS[7].mul && STEPS[7].mode === 'beaker' && STEPS[7].demo.amt === MUL.n * MUL.cup, 'step 8: the mug lands the waterline on 3 × 250');
check(/3 × 250/.test(STEPS[7].choices[STEPS[7].answer]), 'the multiply answer says the multiplication out loud');
check(STEPS[7].choices.some((c) => /253/.test(c)), 'the add-the-count error is on the table');
check(/division/.test(STEPS[7].feedback), 'the reveal turns the picture around into division');

/* dials: the amount, and the change that arrives with the problems */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'amount').max === 1000, 'the instruments read to 1000');
check(DIALS.find((d) => d.key === 'change').unlock === 6, 'the change arrives with the pour step');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the stamp is the integer identity base + pour === order;
   the meter reads 100 nowhere else; every order is reachable.
   ------------------------------------------------------------------------- */
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(t.B % 25 === 0 && t.B >= 100 && t.B <= 500, 'the start is pinned 100–500');
  check(t.T % 25 === 0 && t.T > t.B, 'the order sits above the start');
  check(t.T <= 1000, 'the order stays inside the beaker');
  const need = t.T - t.B;
  check(need >= 100 && need <= 500, `the pour ${need} is on the dial`);
  check(canPour(t.B, need), 'the order is reachable');
}
{
  const t = { B: 200, T: 500 };
  for (let pour = 0; pour <= 500; pour += 25) {
    const r = readingOf(t.B, pour, 1);
    check(isCalibrated(r, t.T) === (r === t.T), `stamp ⟺ equality at pour=${pour}`);
    const m = closeness(r, t.T);
    check(m >= 0 && m <= 100, 'meter in range');
    check((m === 100) === (r === t.T), `meter 100 ⟺ on the line at pour=${pour}`);
  }
  for (let r = 0; r < t.T; r += 25) check(closeness(r + 25, t.T) >= closeness(r, t.T), 'meter monotone below');
  for (let r = 1000; r > t.T; r -= 25) check(closeness(r - 25, t.T) >= closeness(r, t.T), 'meter monotone above');
}
for (let i = 0; i < 200; i++) {
  const t = makeTarget({ B: 200, T: 500 });
  check(!(t.B === 200 && t.T === 500), 'a new order is genuinely new');
}

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bbalance\b|\bpans?\b|\bbeam\b|two.?sided/i, 'no two-sided balance (EquationLab)'],
  [/\brods?\b|\bruler\b|end.?to.?end/i, 'no length devices (MeasurementLab)'],
  [/unit.?cubes?|\bB·h\b|packed/i, 'no solid-volume cubes (VolumeLab)'],
  [/conversion factor|double number line|in disguise/i, 'no conversion device (UnitConversionLab)'],
  [/\bcoins?\b|\bcents?\b/i, 'no coins (MoneyLab)'],
  [/\bworms?\b|\bX marks?\b/i, 'no data collection (LinePlotLab)'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies'],
  [/requestAnimationFrame/, 'nothing animates — the needle is dial-driven'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the change is gated by the model, in both directions */
check(/dir < 0 \? liftMax\(amt\) : pourMax\(amt\)/.test(code), 'the change dial obeys the pour/lift gates');
check(/setChg\(\(v\) => Math\.min\(v, dir < 0 \? liftMax\(na\) : pourMax\(na\)\)\)/.test(code), 'moving the amount re-gates the change');
/* the amount is pinned in the capstone */
check(/calib && dl\.key === 'amount'/.test(code), 'the start is pinned in the capstone');
/* the readouts speak the tick arithmetic the audit proved */
check(/labelBelow\(S\.reading\)/.test(code) && /ticksPast\(S\.reading\)/.test(code), 'the caption walks label + ticks');
/* both instruments draw the same 50/200 face the model declares */
check(/v % LABEL_EVERY === 0/.test(code) && /v \+= TICK_EVERY/.test(code), 'the faces are drawn from the declared spacing');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-gramsandliters: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
