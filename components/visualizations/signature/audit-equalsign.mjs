/* ============================================================================
   audit-equalsign.mjs — numeric + structural proof for EqualSignLab.jsx
   (1.OA.D.7 · the equal sign as a claim; true or false).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-equalsign.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./EqualSignLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function EqualSignLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, TEAL, GOLD, DIALS, CALIB_STEP, clampInt, sideVal, leftVal, rightVal,
            isTrue, gapOf, diagOf, sideText, claimText, healingR2, makeClaim, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  DIALS, CALIB_STEP, clampInt, sideVal, leftVal, rightVal, isTrue, gapOf, diagOf, sideText,
  claimText, healingR2, makeClaim, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE CLAIM — truth is exact equality; the gap and diagnosis agree with it.
   ------------------------------------------------------------------------- */
const sides = [];
for (let a = 0; a <= 10; a++) {
  sides.push([a, null]);
  for (let b = 0; b <= 10; b++) sides.push([a, b]);
}
for (const [l1, l2] of sides) {
  for (const [r1, r2] of sides) {
    const c = { l1, l2, r1, r2 };
    const L = leftVal(c);
    const R = rightVal(c);
    check(L === l1 + (l2 || 0) && R === r1 + (r2 || 0), `side values at ${claimText(c)}`);
    check(isTrue(c) === (L === R), `truth ⟺ equality at ${claimText(c)}`);
    check(gapOf(c) === Math.abs(L - R), `gap at ${claimText(c)}`);
    const d = diagOf(c);
    check(
      (d === 'level') === (L === R) && (d === 'left') === (L > R) && (d === 'right') === (L < R),
      `diagnosis trichotomy at ${claimText(c)}`
    );
    check(isTrue(c) === (d === 'level'), `true ⟺ level (the planks are honest) at ${claimText(c)}`);
  }
}

/* the written claim renders both syntaxes: single numbers and sums */
check(claimText({ l1: 8, l2: null, r1: 8, r2: null }) === '8 = 8', 'plain claim text');
check(claimText({ l1: 8, l2: null, r1: 5, r2: 3 }) === '8 = 5 + 3', 'answer-on-the-left claim text');
check(claimText({ l1: 5, l2: 3, r1: 4, r2: 4 }) === '5 + 3 = 4 + 4', 'two-sums claim text');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE — the demos ARE the standard's syntax tour, and one of
   them is FALSE (the lab's whole reason to exist).
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
  check(s.demo && Number.isInteger(s.demo.l1), `step ${i} claim pinned`);
});
/* the syntax tour: single=single, single=sum, FALSE, sum=sum, dial play */
check(isTrue(STEPS[0].demo) && STEPS[0].demo.l2 == null && STEPS[0].demo.r2 == null, 'step 1: 8 = 8 shape');
check(isTrue(STEPS[1].demo) && STEPS[1].demo.l2 == null && STEPS[1].demo.r2 != null, 'step 2: answer on the left');
check(!isTrue(STEPS[2].demo), 'step 3 shows a FALSE claim — the lab’s reason to exist');
check(isTrue(STEPS[3].demo) && STEPS[3].demo.l2 != null && STEPS[3].demo.r2 != null, 'step 4: two sums');
check(!isTrue(STEPS[4].demo) && STEPS[4].demo.r2 != null, 'step 5 opens broken, for the dial to fix');
check(healingR2(STEPS[4].demo) >= DIALS[0].min && healingR2(STEPS[4].demo) <= DIALS[0].max, 'step 5 is fixable');
/* the operator-misconception distractor is present and is NOT the answer */
{
  const s0 = STEPS[0];
  const idx = s0.choices.findIndex((c) => /answer comes next/i.test(c));
  check(idx >= 0 && idx !== s0.answer, 'the "answer comes next" belief is offered and refuted');
}
check(DIALS.length === 1, 'K-tier: exactly one dial');

/* uniqueness of the level point: for any l1,l2,r1 there is exactly one r2 in
   0…10 that levels the planks — IF it is in range (the knife-edge of step 5) */
for (let l1 = 1; l1 <= 7; l1++)
  for (let l2 = 1; l2 <= 7; l2++)
    for (let r1 = 1; r1 <= 7; r1++) {
      const winners = [];
      for (let r2 = 0; r2 <= 10; r2++) if (isTrue({ l1, l2, r1, r2 })) winners.push(r2);
      check(winners.length <= 1, `at most one leveling value at ${l1}+${l2}=${r1}+◻`);
      if (l1 + l2 - r1 >= 0 && l1 + l2 - r1 <= 10)
        check(winners.length === 1 && winners[0] === l1 + l2 - r1, `the leveling value is l1+l2−r1 at ${l1}+${l2}=${r1}+◻`);
    }

/* ---------------------------------------------------------------------------
   4. CALIBRATION — diagnosis of the ARRIVED claim + current truth; the
   generator always emits curable patients, of both kinds (sick and healthy).
   ------------------------------------------------------------------------- */
let sawTrue = false;
let sawFalse = false;
for (let i = 0; i < 5000; i++) {
  const c = makeClaim(null);
  check(c.l1 >= 1 && c.l1 <= 7 && c.l2 >= 1 && c.l2 <= 7, 'left side in range');
  check(Number.isInteger(c.r1) && c.r1 >= 1, 'right first number sane');
  check(c.r2 >= 0 && c.r2 <= 10, 'the dial slot starts in range');
  const cure = healingR2(c);
  check(cure >= 0 && cure <= 10, `every patient is curable (cure ${cure} in dial range)`);
  if (isTrue(c)) sawTrue = true;
  else sawFalse = true;
}
check(sawTrue && sawFalse, 'the clinic sees both healthy and sick claims');
{
  const prev = makeClaim(null);
  for (let i = 0; i < 200; i++) check(claimText(makeClaim(prev)) !== claimText(prev), 'the next patient is new');
}

/* the stamp gate, exhaustively: arrived claims across the domain × every
   diagnosis × every dial position */
for (let l1 = 1; l1 <= 7; l1 += 2)
  for (let l2 = 1; l2 <= 7; l2 += 2)
    for (let r1 = 1; r1 <= 7; r1 += 2)
      for (let ar2 = 0; ar2 <= 10; ar2 += 2) {
        const arrived = { l1, l2, r1, r2: ar2 };
        const rightDiag = diagOf(arrived);
        for (const pick of [null, 'left', 'level', 'right']) {
          for (let r2 = 0; r2 <= 10; r2++) {
            const current = { l1, l2, r1, r2 };
            const stamped = isCalibrated(pick, arrived, current);
            const should = pick === rightDiag && isTrue(current);
            check(stamped === should, `stamp gate at ${claimText(arrived)} pick=${pick} dial=${r2}`);
            const p = closeness(pick, arrived, current);
            check((p === 100) === stamped, `meter 100 ⟺ stamp at ${claimText(arrived)}`);
          }
        }
      }
check(clampInt(14, 0, 10) === 10 && clampInt(-3, 0, 10) === 0, 'dial clamps');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/balance|scale|\bpans?\b|\bbeam\b|\bweighs?\b/i, 'no balance (EquationLab; font-weight is CSS)'],
  [/solv(e|ing)|unknown|\bfor x\b/i, 'no solving, no unknown (EquationLab)'],
  [/plumb|\btrains?\b|\brods?\b/i, 'no rod trains, no plumb line (AssociativeAdditionLab)'],
  [/greater|less than|bigger number/i, 'no size-comparison language (ComparingLab)'],
  [/\bpour|redistribut|fair share/i, 'no pouring (MeanLab)'],
  [/number.?line|\bhops?\b/i, 'no number line (AddLab)'],
  [/ten.?frame/i, 'no ten-frame (CountingLab)'],
  [/requestAnimationFrame/, 'no rAF (K-tier: nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* restraint: toolbar holds one button; the planks are the only carmine
   geometry (the sign is the object); the clinic locks the dial until the
   diagnosis is committed */
{
  const tb = code.slice(code.indexOf('className="toolbar"'), code.indexOf('</div>', code.indexOf('className="toolbar"')));
  const buttons = tb.split('<button').length - 1;
  check(buttons === 1, `toolbar holds exactly one button (found ${buttons})`);
}
check(/const unlocked = calib \? pick != null : step >= d\.unlock/.test(code), 'the clinic dial waits for the diagnosis');
check(/for \(const off of \[-sep \/ 2, sep \/ 2\]\)/.test(code), 'the sign is drawn as its own two bars');
check(/if \(pick == null\) setPick\(w\)/.test(code) || /disabled=\{pick != null\}/.test(code), 'the diagnosis commits once');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-equalsign: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
