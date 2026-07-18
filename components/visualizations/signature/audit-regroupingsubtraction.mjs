/* ============================================================================
   audit-regroupingsubtraction.mjs — numeric + structural proof for
   RegroupingSubtractionLab.jsx (2.NBT.B.5/7/9 · break a ten to subtract).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-regroupingsubtraction.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./RegroupingSubtractionLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function RegroupingSubtractionLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, DIALS, START_A, START_B, CALIB_STEP, clampInt, tensOf, onesOf,
            needsRegroup, regroupedName, matName, flipError, makeTarget, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  DIALS, START_A, START_B, CALIB_STEP, clampInt, tensOf, onesOf, needsRegroup, regroupedName,
  matName, flipError, makeTarget, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE INVARIANT — the regrouped name keeps the amount, for every minuend.
   ------------------------------------------------------------------------- */
for (let A = 10; A <= 99; A++) {
  const rn = regroupedName(A);
  check(rn.t === tensOf(A) - 1 && rn.o === onesOf(A) + 10, `regrouped name at ${A}`);
  check(10 * rn.t + rn.o === A, `same amount, new name at ${A} (the gold badge is honest)`);
  const before = matName(A, false);
  const after = matName(A, true);
  check(10 * before.t + before.o === A && 10 * after.t + after.o === A, `mat conserves ${A} in both states`);
  check(after.o >= 10 && after.o <= 19, `the ones column becomes teen-rich at ${A}`);
}

/* ---------------------------------------------------------------------------
   3. THE WALL AND THE FLIP ERROR — need ⟺ ones short; the flip error is wrong
   exactly when the wall exists (they differ by 2·(ones(B) − ones(A))).
   ------------------------------------------------------------------------- */
for (let A = 21; A <= 99; A++) {
  for (let B = 1; B <= A; B++) {
    const need = needsRegroup(A, B);
    check(need === (onesOf(A) < onesOf(B)), `wall ⟺ short ones at ${A}−${B}`);
    const fe = flipError(A, B);
    if (need) {
      check(fe !== A - B, `the flip error is genuinely wrong at ${A}−${B}`);
      check(fe - (A - B) === 2 * (onesOf(B) - onesOf(A)), `flip-error gap formula at ${A}−${B}`);
    } else {
      check(fe === A - B, `no wall ⇒ the naive column answer is right at ${A}−${B}`);
    }
    /* after the trade every column can pay */
    if (need) {
      const rn = regroupedName(A);
      check(rn.o >= onesOf(B), `after the trade the ones can pay at ${A}−${B}`);
      check(rn.t >= tensOf(B), `and the tens can still pay at ${A}−${B}`);
      check(10 * (rn.t - tensOf(B)) + (rn.o - onesOf(B)) === A - B, `column payment lands on the difference at ${A}−${B}`);
    }
  }
}
/* the lesson's own numbers */
check(!needsRegroup(47, 23), 'step 1: 47−23 needs no trade');
check(needsRegroup(43, 17), 'steps 2–4: 43−17 hits the wall');
check(flipError(43, 17) === 34, 'the foil 34 is the flip error for 43−17');
check(43 - 17 === 26, 'and 26 is the truth');
check(needsRegroup(52, 28) && !needsRegroup(56, 24) && !needsRegroup(58, 22), 'step 5 trio sorted correctly');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — 6 steps, one calibration (last), scenes pinned,
   TWO dials (the subtraction pair — AddLab precedent), buttons per step.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
  check(s.demo && s.demo.A >= 21 && s.demo.A <= 99 && s.demo.B >= 1 && s.demo.B <= s.demo.A, `step ${i} scene pinned`);
});
check(DIALS.length === 2, 'two dials — the subtraction pair');
check(DIALS[0].unlock < DIALS[1].unlock, 'the dials unlock one per step, minuend first');
check(STEPS[0].demo.A === START_A && STEPS[0].demo.B === START_B, 'step 1 opens on the start pair');
/* the break button exists only from the trade step on; step 1 pays without it */
check(!STEPS[0].breakBtn && !!STEPS[0].pay, 'step 1: pay only');
check(!STEPS[1].breakBtn && !STEPS[1].pay, 'step 2: look at the wall, no actions');
check(!!STEPS[2].breakBtn && !STEPS[2].pay, 'step 3: the trade arrives alone');
check(!!STEPS[3].breakBtn && !!STEPS[3].pay, 'step 4: trade then pay');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — two integer identities; solvable for every target the
   generator can emit; a multiple of 10 can never need the trade.
   ------------------------------------------------------------------------- */
for (let D = 1; D <= 60; D++) {
  if (D % 10 === 0) {
    /* B = A − D shares A's ones digit ⇒ the wall is impossible */
    let anyWall = false;
    for (let A = 21; A <= 99; A++) {
      const B = A - D;
      if (B >= 1 && needsRegroup(A, B)) anyWall = true;
    }
    check(!anyWall, `a difference of ${D} (multiple of 10) can never need the trade`);
  }
}
for (let i = 0; i < 3000; i++) {
  const D = makeTarget(null);
  check(Number.isInteger(D) && D >= 5 && D <= 50 && D % 10 !== 0, 'target in range, never a multiple of 10');
}
for (let i = 0; i < 200; i++) check(makeTarget(23) !== 23, 'a new goal is genuinely new');
/* every emittable target has a witness pair inside the dial ranges */
for (let D = 5; D <= 50; D++) {
  if (D % 10 === 0) continue;
  const B = 19;
  const A = D + 19;
  check(A >= 21 && A <= 99 && B >= 1 && B <= A, `witness pair in range for ${D}`);
  check(isCalibrated(A, B, D), `witness pair stamps for ${D}`);
}
/* the stamp gate, exhaustively over the dial space for sampled targets */
for (const D of [5, 13, 26, 37, 49]) {
  for (let A = 21; A <= 99; A++) {
    for (let B = 1; B <= A; B++) {
      const stamped = isCalibrated(A, B, D);
      const should = A - B === D && onesOf(A) < onesOf(B);
      check(stamped === should, `stamp gate at ${A}−${B} vs ${D}`);
      const p = closeness(A, B, D);
      check((p === 100) === stamped, `meter 100 ⟺ stamp at ${A}−${B} vs ${D}`);
    }
  }
}
check(clampInt(120, 21, 99) === 99 && clampInt(3, 21, 99) === 21, 'dial clamps');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/carr(y|ies|ied|ying)/i, 'no carrying (PlaceValueStrategiesLab owns the addition mirror)'],
  [/number.?line|\bhops?\b|count.?back/i, 'no number line, no count-back (SubtractionLab)'],
  [/check.?by.?adding|check arc/i, 'no check-by-adding arc (SubtractionLab)'],
  [/bundl(?!e)|snap together|ten.?rod\b/i, 'no bundling-up story (TwoDigitNumberLab)'],
  [/divid|quotient|bring down/i, 'no division (LongDivisionLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier: nothing animates)'],
  [/borrow/i, 'says "break/trade", never "borrow" — a loan implies paying back, and nothing comes back'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* restraint: toolbar ≤ 3 buttons; the invariant badge is drawn once; the
   subtrahend dial is clamped to the minuend in both handlers */
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons <= 3, `toolbar holds at most three buttons (found ${buttons})`);
}
check((code.match(/still \$\{S\.A\}/g) || []).length === 1, 'the gold invariant badge is drawn exactly once');
check(/if \(B > a\) setB\(a\)/.test(code), 'lowering the minuend re-clamps the subtrahend');
check(/clampInt\(v, 1, A\)/.test(code), 'the subtrahend can never exceed the minuend');
check(/setBroken\(false\);\s*\n\s*setPaid\(false\);/.test(code), 'dial changes reset the trade state');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-regroupingsubtraction: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
