/* ============================================================================
   audit-multiplicativecomparison.mjs — numeric + structural proof for
   MultiplicativeComparisonLab.jsx (4.OA.A.1–2 · times-as-many vs more-than).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-multiplicativecomparison.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./MultiplicativeComparisonLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function MultiplicativeComparisonLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BASE, GOLD, DIALS, START_A, START_K, CALIB_STEP, clampInt, timesOf,
            moreOf, leadTimes, leadMore, reverseTimes, claimsAgree, makeMystery, calibChecks,
            isCalibrated, closeness, STEPS };`
)();
const {
  DIALS, START_A, START_K, CALIB_STEP, clampInt, timesOf, moreOf, leadTimes, leadMore,
  reverseTimes, claimsAgree, makeMystery, calibChecks, isCalibrated, closeness, STEPS,
} = sandbox;

const A_LO = 2, A_HI = 8, K_LO = 2, K_HI = 4, R_LO = 4, R_HI = 32;

/* ---------------------------------------------------------------------------
   2. THE TWO BUILDS — copy and stub, exact for every dial pair; the leads
   behave as the lesson claims; the claims agree exactly once.
   ------------------------------------------------------------------------- */
let buildOK = true;
let leadOK = true;
let agreeCount = 0;
for (let a = A_LO; a <= A_HI; a++) {
  for (let k = K_LO; k <= K_HI; k++) {
    if (timesOf(a, k) !== k * a || moreOf(a, k) !== a + k) buildOK = false;
    if (leadTimes(a, k) !== timesOf(a, k) - a) leadOK = false;
    if (leadMore(a, k) !== moreOf(a, k) - a || leadMore(a, k) !== k) leadOK = false;
    if (a < A_HI && !(leadTimes(a + 1, k) > leadTimes(a, k))) leadOK = false; // grows with Ana
    if (a < A_HI && leadMore(a + 1, k) !== leadMore(a, k)) leadOK = false; // k forever
    if (claimsAgree(a, k)) agreeCount++;
    if (reverseTimes(timesOf(a, k), k) !== a) buildOK = false; // division undoes the copy
  }
}
check(buildOK, 'copy = k·a, stub = a+k, division undoes the copy (all 21 dial pairs)');
check(leadOK, 'the copy’s lead grows with Ana; the stub’s lead is k forever');
check(agreeCount === 1 && claimsAgree(2, 2), 'the claims agree at exactly one pair (a=2, k=2) — nowhere else');

/* the numbers the copy quotes, pinned */
check(timesOf(4, 3) === 12 && moreOf(4, 3) === 7, 'step 1: Ana 4 → 12 vs 7');
check(timesOf(6, 3) === 18 && moreOf(6, 3) === 9, 'step 2: Ana 6 → 18 vs 9');
check(reverseTimes(12, 3) === 4, 'step 4: Ben 12 = 3 × Ana → Ana 4');
for (let a = A_LO; a <= 4; a++) {
  for (let k = K_LO; k <= K_HI; k++) {
    check(leadTimes(2 * a, k) === 2 * leadTimes(a, k), `doubling Ana doubles the copy’s lead (a=${a}, k=${k})`);
  }
}

/* ---------------------------------------------------------------------------
   3. THE CAPSTONE IS A UNIQUENESS THEOREM — every mystery the generator can
   emit has exactly ONE (Ana, Rio) pair inside the dials.
   ------------------------------------------------------------------------- */
let mysteryOK = true;
for (let i = 0; i < 4000; i++) {
  const m = makeMystery(null);
  if (!(m.k >= K_LO && m.k <= K_HI)) mysteryOK = false;
  if (m.m % (m.k - 1) !== 0) mysteryOK = false;
  const aStar = m.m / (m.k - 1);
  if (!(aStar >= A_LO && aStar <= A_HI)) mysteryOK = false;
}
check(mysteryOK, 'every mystery has an in-range hidden pair (4000 deals)');
{
  let uniqueOK = true;
  for (let k = K_LO; k <= K_HI; k++) {
    for (let aStar = A_LO; aStar <= A_HI; aStar++) {
      const m = { k, m: (k - 1) * aStar };
      let count = 0;
      let solution = null;
      for (let a = A_LO; a <= A_HI; a++) {
        for (let r = R_LO; r <= R_HI; r++) {
          if (r === m.k * a && r === a + m.m) {
            count++;
            solution = { a, r };
          }
        }
      }
      if (count !== 1) uniqueOK = false;
      if (solution && (solution.a !== aStar || solution.r !== k * aStar)) uniqueOK = false;
      if (solution && (solution.r < R_LO || solution.r > R_HI)) uniqueOK = false;
    }
  }
  check(uniqueOK, 'brute force: exactly ONE (Ana, Rio) pair satisfies both clues, for every emittable mystery');
}
{
  const m = makeMystery(null);
  let fresh = true;
  for (let i = 0; i < 100; i++) {
    const n = makeMystery(m);
    if (n.k === m.k && n.m === m.m) fresh = false;
  }
  check(fresh, 'a new mystery is genuinely new');
}
{
  const m = { k: 3, m: 8 }; // hidden pair a=4, r=12
  check(isCalibrated(4, 12, m), 'the true pair stamps');
  check(closeness(4, 12, m) === 100, 'meter 100 on the stamp');
  check(!isCalibrated(4, 11, m) && !isCalibrated(4, 13, m), 'Rio one off refuses');
  check(!isCalibrated(3, 12, m) && !isCalibrated(5, 12, m), 'Ana one off refuses');
  check(closeness(3, 9, m) === 50, 'clue 1 alone meters 50 (9 = 3×3 but 9 ≠ 3+8)');
  check(closeness(2, 10, m) === 50, 'clue 2 alone meters 50 (10 = 2+8 but 10 ≠ 3×2)');
  check(closeness(2, 5, m) === 0, 'neither clue, meter 0');
  check(!isCalibrated(4, 12, null), 'no mystery, no stamp');
}
check(clampInt(50, 4, 32) === 32 && clampInt(1, 2, 8) === 2, 'dial clamps');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
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
});
check(STEPS[4].lens === 'reverse', 'step 4 is the reverse (division) reading');
check(DIALS.length === 3 && DIALS[0].unlock < DIALS[1].unlock && DIALS[1].unlock < DIALS[2].unlock, 'dials unlock one per step');
check(START_A === 4 && START_K === 3, 'the lesson opens on Ana 4, k 3');
check(/setA\(6\)/.test(code), 'step 2 slides Ana to 6, as the copy says');
check(/DIALS\.filter\(\(d\) => d\.key !== 'k'\)/.test(code), 'the k dial is taken away in the capstone (the mystery owns k)');
check(STEPS[0].q.includes('same'), 'the opening question is THE question: same or not?');
check(STEPS[1].choices.some((c) => c.includes('12')) && STEPS[1].choices.some((c) => c.includes('7')), 'both builds are on the table in step 1');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/batch|double number line|unit rate/i, 'no batch tape, no double number line (RatioLab)'],
  [/\barrays?\b|rows and columns|\bareas?\b/i, 'no array, no area (MultiplicationLab)'],
  [/number line|\bhops?\b|count.?on/i, 'no number line, no hops (AddLab)'],
  [/how much longer|\bruler\b/i, 'nothing is measured (MeasurementLab)'],
  [/\bgreater\b|less than|which is bigger/i, 'never asks which is bigger (ComparingLab)'],
  [/fraction/i, 'whole numbers only (FractionTimesWholeLab)'],
  [/skip.?count|multiples? of/i, 'no skip-counting (MultiplesLab)'],
  [/requestAnimationFrame/, 'no rAF (nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the owned gestures are named on the canvas */
check(/copies of Ana/.test(code), 'the copy gesture is named');
check(/stub/i.test(code), 'the stub gesture is named');
check(/seam/i.test(code), 'the seams mark how the build was made');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-multiplicativecomparison: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
