/* ============================================================================
   audit-decimalarithmetic.mjs — numeric + structural proof for
   DecimalArithmeticLab.jsx (5.NBT.B.7 · add decimals by aligning the places).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-decimalarithmetic.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./DecimalArithmeticLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function DecimalArithmeticLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, ADDEND, GOLD, DIALS, START_A, START_B, CALIB_STEP, clampInt, clampB,
            digitsA, digitsB, trueSumH, ghostDigits, ghostReadH, hasCarry, columnAdd,
            fmtT, fmtH, cardsFor, cardOrder, makePatient, calibChecks, closeness,
            isCalibrated, STEPS };`
)();
const {
  DIALS, START_A, START_B, CALIB_STEP, clampInt, clampB, digitsA, digitsB, trueSumH,
  ghostDigits, ghostReadH, hasCarry, columnAdd, fmtT, fmtH, cardsFor, cardOrder,
  makePatient, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* every legal dial pair: aT 11…99 tenths, bH 11…99 hundredths never ×10 */
const pairs = [];
for (let a = 11; a <= 99; a++) for (let b = 11; b <= 99; b++) if (b % 10 !== 0) pairs.push([a, b]);

/* ---------------------------------------------------------------------------
   2. THE COLUMN MACHINE — reconstructs 10·A + B for every pair; carries are
   exactly the ten-for-one trades; the ghost is never the truth.
   ------------------------------------------------------------------------- */
let machineOK = true;
let carryOK = true;
let ghostOK = true;
for (const [a, b] of pairs) {
  const m = columnAdd(a, b);
  if (m.tens * 1000 + m.ones * 100 + m.tenths * 10 + m.hundredths !== trueSumH(a, b)) machineOK = false;
  if (m.carryT !== ((a % 10) + Math.floor(b / 10) >= 10)) carryOK = false;
  if (m.carryT !== hasCarry(a, b)) carryOK = false;
  if ([m.tens, m.ones, m.tenths, m.hundredths].some((d) => !Number.isInteger(d) || d < 0 || d > 9)) machineOK = false;
  if (ghostReadH(a, b) === trueSumH(a, b)) ghostOK = false;
}
check(machineOK, 'column machine reconstructs 10·A + B (all 7,128 pairs)');
check(carryOK, 'the carry fires exactly when ten tenths trade for one one');
check(ghostOK, 'the right-edge habit is never accidentally correct');
check(ghostDigits(37, 25) === 62, 'the lesson pair prints the habit’s 62');
check(trueSumH(37, 25) === 395, '3.70 + 0.25 = 3.95');
check(hasCarry(37, 65) && trueSumH(37, 65) === 435, 'the step-3 carry pair: 3.7 + 0.65 = 4.35');

/* digits and formatting are exact string place value, never a float */
check(JSON.stringify(digitsA(37)) === '[3,7]' && JSON.stringify(digitsB(25)) === '[0,2,5]', 'digit split');
check(fmtT(37) === '3.7' && fmtH(25) === '0.25' && fmtH(395) === '3.95' && fmtH(1089) === '10.89', 'exact formatting');
for (const [a, b] of pairs) {
  const s = fmtH(trueSumH(a, b));
  const back = Math.round(Number(s) * 100);
  if (back !== trueSumH(a, b)) {
    check(false, `format round-trip broke at ${a},${b}`);
    break;
  }
}
check(true, 'format round-trips through every sum');

/* clamps: B can never be a tenths number in costume */
let clampOK = true;
for (let v = -5; v <= 130; v++) {
  const b = clampB(v);
  if (b < 11 || b > 99 + 1 || b % 10 === 0) clampOK = false;
}
check(clampOK, 'clampB skips every multiple of ten and stays on the dial');
check(clampInt(200, 11, 99) === 99 && clampInt(-4, -1, 1) === -1, 'dial clamps');

/* ---------------------------------------------------------------------------
   3. LESSON STRUCTURE.
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
check(DIALS.length === 3, 'three dials: slide, A, B');
check(DIALS[0].key === 'pos' && DIALS[0].min === -1 && DIALS[0].max === 1, 'the slide dial moves one column each way');
check(DIALS[0].unlock < DIALS[1].unlock && DIALS[1].unlock < DIALS[2].unlock, 'dials unlock one per step');
check(START_A === 37 && START_B === 25, 'the lesson opens on 3.7 + 0.25');
check(STEPS[1].q.includes('62'), 'the trap question hands the child the habit’s 62');
check(STEPS[1].choices.some((c) => c.includes('0.62')) && STEPS[1].choices.some((c) => c.includes('6.2')), 'both classic wrong readings are on the table');
check(/setAT\(37\)/.test(code) && /setBH\(65\)/.test(code), 'step 3 pins the carry scene (3.7 + 0.65)');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — align AND answer; the cards are provably distinct; a wrong
   pick can never be cycled into a stamp.
   ------------------------------------------------------------------------- */
let cardsOK = true;
let orderOK = true;
for (const [a, b] of pairs) {
  const [t, g, x] = cardsFor(a, b);
  if (t !== trueSumH(a, b)) cardsOK = false;
  if (t === g || t === x || g === x) cardsOK = false;
  if (x !== (hasCarry(a, b) ? t - 100 : t + 100)) cardsOK = false;
  if (x <= 0) cardsOK = false;
  const o = cardOrder(a, b);
  if ([...o].sort().join(',') !== '0,1,2') orderOK = false;
}
check(cardsOK, 'three answer cards, pairwise distinct, true card first (all pairs)');
check(orderOK, 'the shuffle is always a permutation');

for (let i = 0; i < 4000; i++) {
  const p = makePatient(null);
  if (!(p.aT >= 11 && p.aT <= 99 && p.bH >= 11 && p.bH <= 100 && p.bH % 10 !== 0)) {
    check(false, 'patient out of range');
    break;
  }
}
check(true, 'every patient is a legal dial pair (4000 deals)');
{
  const p = makePatient(null);
  let fresh = true;
  for (let i = 0; i < 100; i++) {
    const q = makePatient(p);
    if (q.aT === p.aT && q.bH === p.bH) fresh = false;
  }
  check(fresh, 'a new patient is genuinely new');
}
{
  const [a, b] = [37, 25];
  const slotTrue = cardOrder(a, b).indexOf(0);
  check(isCalibrated(0, slotTrue, a, b), 'aligned + true card stamps');
  check(closeness(0, slotTrue, a, b) === 100, 'meter 100 on the stamp');
  for (let s = 0; s < 3; s++) {
    if (s === slotTrue) continue;
    check(!isCalibrated(0, s, a, b), 'a wrong card refuses');
    check(closeness(0, s, a, b) === 50, 'a wrong card holds the meter at 50');
  }
  check(!isCalibrated(-1, slotTrue, a, b), 'misaligned refuses even with the true card');
  check(!isCalibrated(1, slotTrue, a, b), 'overshot refuses even with the true card');
  check(closeness(-1, null, a, b) === 0, 'nothing done, nothing metered');
}
/* the pick is one-shot: choosing disables the cards, so the stamp cannot be
   reached by cycling guesses; and the canvas hides the sum until the pick */
check(/disabled=\{!aligned \|\| pick != null\}/.test(code), 'a pick locks the cards (no guess-cycling)');
check(/S\.calib && !S\.pickDone/.test(code), 'the capstone canvas hides the sum until the child answers');

/* ---------------------------------------------------------------------------
   5. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/10\s*[x×]\s*10|hundredths grid|magnif/i, 'no hundredths grid, no magnifier (DecimalLab)'],
  [/base.?ten|\brods?\b|bundl|\bbins?\b|halo/i, 'no base-ten blocks (PlaceValueStrategiesLab)'],
  [/borrow|break a ten|subtract/i, 'nothing subtracts (RegroupingSubtractionLab)'],
  [/dollar|\bcents?\b|money|\$\d/i, 'no money framing (MoneyLab)'],
  [/number line/i, 'no number line (DecimalLab owns it)'],
  [/greater|less than|\bcompare/i, 'nothing is compared (ComparingLab)'],
  [/multipl(y|ie|ica)|divid/i, 'this corner of 5.NBT.B.7 adds only'],
  [/requestAnimationFrame/, 'no rAF (nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the one gold point line: a single dashed vertical is the anchor */
check((code.match(/the point line/g) || []).length >= 2, 'the point line is named on the canvas');
check(/setLineDash\(\[6, 5\]\)/.test(code), 'the point line is the dashed gold vertical');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-decimalarithmetic: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
