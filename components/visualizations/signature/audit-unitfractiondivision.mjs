/* ============================================================================
   audit-unitfractiondivision.mjs — numeric + structural proof for
   UnitFractionDivisionLab.jsx (5.NF.B.7 · divide with unit fractions —
   "the stick count, and division that grows").

   Pattern (per HundredChartLab / FractionAdditionLab):
     • SLICE the pure model out of the shipped .jsx and EVAL it.
     • Prove every stated fact by exhaustive integer sweep — the exact fit,
       the multiplication check, the shared piece's size, the GROWTH claim,
       and the stamp gate n·b === target.
     • Enforce the lab's REFUSALS (no remainders, no arrays, no rods or
       rulers, no loaves-and-friends, no F1–F5 furniture) by grepping the
       code below the header.

   Run:  node audit-unitfractiondivision.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./UnitFractionDivisionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function UnitFractionDivisionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd).replace(/prefers-reduced-motion: reduce/g, 'prefers-rm');

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, DIALS, CALIB_STEP, clampInt, fitCount, fitIsExact,
            checkFact, sharePiece, lessThan, grows, makeTarget, closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, fitCount, fitIsExact,
  checkFact, sharePiece, lessThan, grows, makeTarget, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE FIT — exact, checked by multiplication, and GROWING.
   ------------------------------------------------------------------------- */
for (let n = 1; n <= 6; n++)
  for (let b = 2; b <= 6; b++) {
    check(fitCount(n, b) === n * b, `fit count at ${n} ÷ 1/${b}`);
    check(fitIsExact(n, b), `the fit is exact at ${n} ÷ 1/${b} — no partial stick`);
    const cf = checkFact(n, b);
    check(cf.count === n * b && cf.unitDen === b && cf.gives === n, `check fact at ${n} ÷ 1/${b}`);
    /* the check really checks: count × 1/b = count/b = n, as integers */
    check(cf.count % cf.unitDen === 0 && cf.count / cf.unitDen === cf.gives, `sticks rebuild the ribbon at ${n} ÷ 1/${b}`);
    /* THE HEADLINE: division by a unit fraction grows */
    check(grows(n, b) === true, `division grows at ${n} ÷ 1/${b}`);
    check(fitCount(n, b) > n, `the quotient exceeds the dividend at ${n} ÷ 1/${b}`);
  }
check(fitCount(3, 4) === 12, '3 ÷ 1/4 = 12');
check(fitCount(1, 4) === 4, 'one whole holds four quarter-sticks — the denominator’s promise');
check(fitCount(2, 3) === 6, 'the raisin problem: 2 ÷ 1/3 = 6 servings');
/* the growth is STRICT, and it needs b ≥ 2: a "stick" of 1/1 is the whole
   itself and fits exactly n times — dividing by 1 grows nothing */
check(grows(5, 1) === false, 'dividing by 1/1 does not grow');

/* ---------------------------------------------------------------------------
   3. THE SHARE — a piece of a piece, smaller than the piece, exactly 1/(b·n).
   ------------------------------------------------------------------------- */
for (let n = 1; n <= 6; n++)
  for (let b = 2; b <= 6; b++) {
    const sp = sharePiece(b, n);
    check(sp.n === 1 && sp.den === b * n, `share size at 1/${b} ÷ ${n}`);
    if (n > 1) check(lessThan(sp.n, sp.den, 1, b), `a piece of a piece is smaller at 1/${b} ÷ ${n}`);
    /* the reciprocal pair: sharing's bottom is fitting's count */
    check(sp.den === fitCount(n, b), 'the two questions share one multiplication');
    /* the check works here too: n copies of the share rebuild the piece */
    check((sp.n * n) * b === sp.den * 1, `check: ${n} × 1/${sp.den} = 1/${b} at ${n},${b}`);
  }
check(sharePiece(3, 2).den === 6, '1/3 ÷ 2 = 1/6');
check(lessThan(1, 6, 1, 3), '1/6 < 1/3 — sharing shrank the piece');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — 7 steps, one calibration (last), demos pin scenes
   with their modes, the wrong answers are the real classroom errors.
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
  check(dm && dm.n >= 1 && dm.n <= 6 && dm.b >= 2 && dm.b <= 6, `step ${i} demo in range`);
  check(dm.mode === 'fit' || dm.mode === 'share', `step ${i} names its scene`);
});
check(STEPS.filter((s) => s.demo && s.demo.mode === 'share').length === 1, 'exactly one sharing step');
check(STEPS[0].demo.n === 1 && STEPS[0].demo.b === 4, 'the lab opens on one whole and quarters');
check(/4 —/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 answer is the denominator’s promise');
check(/12/.test(STEPS[1].choices[STEPS[1].answer]) && fitCount(3, 4) === 12, 'step 2: 3 ÷ 1/4 = 12');
check(/False/.test(STEPS[2].choices[STEPS[2].answer]) && /bigger/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 kills the shrink myth');
check(STEPS[3].lens && STEPS[3].lens.check === true, 'step 4 shows the check line');
check(/12 × 1\/4 = 3/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 answer is the rebuild fact');
check(STEPS[4].demo.mode === 'share' && STEPS[4].demo.b === 3 && STEPS[4].demo.n === 2, 'step 5 shares a third between two');
check(/1\/6/.test(STEPS[4].choices[STEPS[4].answer]) && sharePiece(3, 2).den === 6, 'step 5: 1/3 ÷ 2 = 1/6');
check(STEPS[4].choices.some((c) => /2\/3/.test(c)), 'step 5 offers the multiply-instead slip');
check(STEPS[5].demo.n === 2 && STEPS[5].demo.b === 3 && /6 servings/.test(STEPS[5].choices[STEPS[5].answer]), 'step 6: the raisins count 6');
check(STEPS[5].choices.some((c) => /cannot divide/.test(c)), 'step 6 offers the impossibility myth');

/* dials: two — the ribbon and the stick */
check(DIALS.length === 2, 'two dials');
check(DIALS.find((d) => d.key === 'ribbon').min === 1 && DIALS.find((d) => d.key === 'ribbon').max === 6, 'ribbon 1–6');
check(DIALS.find((d) => d.key === 'stick').min === 2 && DIALS.find((d) => d.key === 'stick').max === 6, 'stick 1/2–1/6');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — the stamp is the integer identity n·b === target; the
   meter reads 100 nowhere else; every posted count has a recipe.
   ------------------------------------------------------------------------- */
for (let t = 4; t <= 30; t++) {
  for (let n = 1; n <= 6; n++)
    for (let b = 2; b <= 6; b++) {
      const c = fitCount(n, b);
      check(isCalibrated(c, t) === (c === t), `stamp ⟺ equality at ${n}×${b} vs ${t}`);
      const m = closeness(c, t);
      check(m >= 0 && m <= 100, 'meter in range');
      check((m === 100) === (c === t), `meter 100 ⟺ fit at ${n}×${b} vs ${t}`);
    }
  for (let c = 0; c < t; c++) check(closeness(c + 1, t) >= closeness(c, t), `meter monotone below t=${t}`);
  for (let c = 40; c > t; c--) check(closeness(c - 1, t) >= closeness(c, t), `meter monotone above t=${t}`);
}
for (let i = 0; i < 3000; i++) {
  const t = makeTarget(null);
  check(Number.isInteger(t) && t >= 4 && t <= 30, 'posted count in range');
  let recipes = 0;
  for (let n = 1; n <= 6; n++) for (let b = 2; b <= 6; b++) if (n * b === t) recipes++;
  check(recipes >= 1, `count ${t} has a recipe`);
}
for (let i = 0; i < 200; i++) check(makeTarget(12) !== 12, 'a new count is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/remainder/i, 'no remainders — unit-fraction fits are exact (DivisionLab owns r)'],
  [/\barrays?\b|unit.?squares?/i, 'no array (DivisionLab/MultiplicationLab)'],
  [/\bloa(f|ves)\b|\bfriends?\b|\bcounter\b/i, 'no loaves-and-friends (FractionAsDivisionLab)'],
  [/\brods?\b|\bcubes?\b|\bruler\b|estimat/i, 'no rods, rulers, estimation (MeasurementLab)'],
  [/\bgauge\b|\bpivot\b/i, 'no factor gauge (ScalingLab)'],
  [/\boverlap\b|shading/i, 'no overlap square (FractionMultiplicationLab)'],
  [/\bshelf\b|\bseam\b|\brails?\b|\bjoints?\b|\bplates?\b|\btrays?\b|\bbricks?\b/i, 'no F1/F2/F3 furniture'],
  [/number.?line|\bhops?\b|skip.?count/i, 'no number line (MultiplesLab)'],
  [/simplif|\bgcd\b|lowest terms|\breduces?\b/i, 'never simplifies (EquivalentFractionsLab)'],
  [/balance|\bpans?\b/i, 'no balance (EquationLab)'],
  [/long division|tableau/i, 'no paper algorithm (LongDivisionLab)'],
  [/requestAnimationFrame/, 'nothing animates — the fit is a still picture'],
  [/speechSynthesis/, 'no speech engine'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* structural: the scenes draw from the audited model */
check(/fitCount\(S\.n, S\.b\)/.test(code), 'the stick count is fitCount()');
check(/sharePiece\(S\.b, S\.n\)/.test(code), 'the share is sharePiece()');
check(/checkFact\(S\.n, S\.b\)/.test(code), 'the check line is checkFact()');
/* exactly one loose stick is drawn as the measuring tool */
check(/the stick — 1\//.test(code), 'the loose stick is labelled');
/* the capstone runs in fit mode: the count is the challenge */
check(/const mode = calib \? 'fit'/.test(code), 'the capstone measures');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-unitfractiondivision: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
