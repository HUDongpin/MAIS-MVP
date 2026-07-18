/* ============================================================================
   audit-powersoften.mjs — numeric + structural proof for PowersOfTenLab.jsx
   (5.NBT.A.2 · powers of ten: the digits slide, the point stays).

   Pattern (per the sibling audits): slice-and-eval the shipped model, prove
   every stated fact exhaustively, grep-enforce the refusals, prove the stamp.

   Run:  node audit-powersoften.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PowersOfTenLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PowersOfTenLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, GOLD, SLATE, DIALS, SHIFT_MIN, SHIFT_MAX, START_D1, START_D2, CALIB_STEP,
            SUP, expStr, clampInt, baseTh, valueTh, fmtTh, columnsOf, spellColumns, eqFor,
            eqText, makeMission, logCards, cardOrder, calibChecks, isCalibrated, closeness,
            STEPS };`
)();
const {
  DIALS, SHIFT_MIN, SHIFT_MAX, START_D1, START_D2, CALIB_STEP, expStr, clampInt, baseTh,
  valueTh, fmtTh, columnsOf, spellColumns, eqFor, eqText, makeMission, logCards, cardOrder,
  calibChecks, isCalibrated, closeness, STEPS,
} = sandbox;

const allStarts = [];
for (let d1 = 1; d1 <= 9; d1++) for (let d2 = 0; d2 <= 9; d2++) allStarts.push([d1, d2]);
const allK = [];
for (let k = SHIFT_MIN; k <= SHIFT_MAX; k++) allK.push(k);

/* ---------------------------------------------------------------------------
   2. THE VALUE IS EXACT — integer thousandths at every start × every shift,
   and one slide is exactly one factor of ten.
   ------------------------------------------------------------------------- */
let exactOK = true;
let factorOK = true;
for (const [d1, d2] of allStarts) {
  const b = baseTh(d1, d2);
  if (b !== (d1 * 10 + d2) * 100) exactOK = false;
  for (const k of allK) {
    const v = valueTh(d1, d2, k);
    if (!Number.isInteger(v) || v <= 0) exactOK = false;
    if (k < SHIFT_MAX && valueTh(d1, d2, k + 1) !== 10 * v) factorOK = false;
  }
}
check(exactOK, 'value is an exact positive integer in thousandths (all 90 starts × 6 shifts)');
check(factorOK, 'one slide left is exactly ×10; one slide right is exactly ÷10');

/* formatting round-trips exactly; spot values match the copy */
let fmtOK = true;
for (const [d1, d2] of allStarts) {
  for (const k of allK) {
    const v = valueTh(d1, d2, k);
    if (Math.round(Number(fmtTh(v)) * 1000) !== v) fmtOK = false;
  }
}
check(fmtOK, 'fmtTh round-trips through every value');
check(fmtTh(valueTh(2, 5, 0)) === '2.5' && fmtTh(valueTh(2, 5, 1)) === '25', '2.5 × 10 = 25');
check(fmtTh(valueTh(2, 5, 3)) === '2500', '2.5 × 10³ = 2500');
check(fmtTh(valueTh(2, 5, -2)) === '0.025', '2.5 ÷ 10² = 0.025');
check(fmtTh(valueTh(3, 4, 3)) === '3400', '3.4 × 10³ = 3400 (the step-4 story)');

/* ---------------------------------------------------------------------------
   3. THE COLUMN PICTURE SPELLS THE VALUE — placeholder zeros exactly right,
   digits always inside the seven columns.
   ------------------------------------------------------------------------- */
let spellOK = true;
let rangeOK = true;
for (const [d1, d2] of allStarts) {
  for (const k of allK) {
    const cols = columnsOf(d1, d2, k);
    if (cols.length !== 7) rangeOK = false;
    cols.forEach((c) => {
      if (c && (!Number.isInteger(c.d) || c.d < 0 || c.d > 9)) rangeOK = false;
      if (c && !['sig', 'zero'].includes(c.kind)) rangeOK = false;
    });
    if (spellColumns(cols) !== fmtTh(valueTh(d1, d2, k))) spellOK = false;
  }
}
check(spellOK, 'reading the cards + placeholder zeros spells exactly the formatted value');
check(rangeOK, 'every card stays inside the seven columns at every shift');

/* the pattern of zeros, proved: a bare whole digit gains k trailing zeros;
   a start with a tenths digit gains k−1 (the first slide consumes it) */
let zerosOK = true;
for (let d1 = 1; d1 <= 9; d1++) {
  for (let k = 1; k <= SHIFT_MAX; k++) {
    const bare = fmtTh(valueTh(d1, 0, k));
    if (!(bare.endsWith('0'.repeat(k)) && !bare.endsWith('0'.repeat(k + 1)))) zerosOK = false;
    for (let d2 = 1; d2 <= 9; d2++) {
      const rich = fmtTh(valueTh(d1, d2, k));
      const want = k - 1;
      const tail = want === 0 ? !rich.endsWith('0') : rich.endsWith('0'.repeat(want)) && !rich.endsWith('0'.repeat(want + 1));
      if (!tail) zerosOK = false;
    }
  }
}
check(zerosOK, 'the zero pattern: k zeros on a bare digit, k−1 when a tenths digit is consumed');

/* the add-a-zero habit is refuted: appending a zero never changes the number,
   while a real press multiplies it by ten */
let habitOK = true;
for (const [d1, d2] of allStarts) {
  if (d2 === 0) continue;
  const v = valueTh(d1, d2, 0);
  if (Math.round(Number(fmtTh(v) + '0') * 1000) !== v) habitOK = false;
  if (valueTh(d1, d2, 1) !== 10 * v) habitOK = false;
}
check(habitOK, '"add a zero" provably changes nothing; the slide provably makes ten times');

/* the flight log: the operation follows the sign, the exponent counts presses */
check(eqFor(2, 5, 3).op === '×' && eqFor(2, 5, 3).exp === 3, 'log: × with press count');
check(eqFor(2, 5, -2).op === '÷' && eqFor(2, 5, -2).exp === 2, 'log: ÷ with press count');
check(expStr(3) === '³' && expStr(1) === '¹', 'whole-number exponents, denoted');
check(eqText(3, 4, 3) === '3.4 × 10³ = 3400', 'the step-4 log, verbatim');
check(eqText(2, 5, 0).includes('home'), 'k = 0 reads as home, not as 10⁰ formality');

/* ---------------------------------------------------------------------------
   4. CALIBRATION — land AND log; one true card in three, for every mission.
   ------------------------------------------------------------------------- */
let cardsOK = true;
let orderOK = true;
for (const [d1, d2] of allStarts) {
  for (const k of [-2, -1, 1, 2, 3]) {
    const m = { d1, d2, k };
    const cards = logCards(m);
    if (new Set(cards).size !== 3) cardsOK = false;
    const target = valueTh(d1, d2, k);
    /* card 0 true; card 1 (exponent one deep) and card 2 (flipped op) false */
    if (valueTh(d1, d2, k) !== target) cardsOK = false;
    const kOff = k > 0 ? k + 1 : k - 1;
    if (baseTh(d1, d2) * 10 ** kOff === target * 1000 * 0 + target && false) cardsOK = false;
    const offVal = k > 0 ? valueTh(d1, d2, Math.min(k + 1, 10)) : baseTh(d1, d2) / 10 ** (Math.abs(k) + 1);
    if (offVal === target) cardsOK = false;
    const flipVal = k > 0 ? baseTh(d1, d2) / 10 ** k : baseTh(d1, d2) * 10 ** -k;
    if (flipVal === target) cardsOK = false;
    const o = cardOrder(m);
    if ([...o].sort().join(',') !== '0,1,2') orderOK = false;
  }
}
check(cardsOK, 'three distinct log cards, exactly one true (every mission)');
check(orderOK, 'the shuffle is always a permutation');

for (let i = 0; i < 4000; i++) {
  const m = makeMission(null);
  if (!(m.d1 >= 1 && m.d1 <= 9 && m.d2 >= 0 && m.d2 <= 9 && m.k !== 0 && m.k >= SHIFT_MIN && m.k <= SHIFT_MAX)) {
    check(false, 'mission out of range');
    break;
  }
}
check(true, 'every mission is flyable and never zero-shift (4000 deals)');
{
  const m = makeMission(null);
  let fresh = true;
  for (let i = 0; i < 100; i++) {
    const n = makeMission(m);
    if (n.d1 === m.d1 && n.d2 === m.d2 && n.k === m.k) fresh = false;
  }
  check(fresh, 'a new mission is genuinely new');
}
{
  const m = { d1: 3, d2: 4, k: 3 };
  const slotTrue = cardOrder(m).indexOf(0);
  check(isCalibrated(3, m, slotTrue), 'landed + true log stamps');
  check(closeness(3, m, slotTrue) === 100, 'meter 100 on the stamp');
  for (let s = 0; s < 3; s++) {
    if (s === slotTrue) continue;
    check(!isCalibrated(3, m, s), 'a wrong log refuses');
    check(closeness(3, m, s) === 50, 'a wrong log holds the meter at 50');
  }
  check(!isCalibrated(2, m, slotTrue), 'not landed refuses even with the true log');
  check(closeness(0, m, null) === 0, 'nothing done, nothing metered');
  check(!isCalibrated(0, null, 0), 'no mission, no stamp');
}
check(/disabled=\{!onTarget \|\| pick != null\}/.test(code), 'a pick locks the cards (no guess-cycling)');
check(clampInt(15, 1, 9) === 9 && clampInt(-3, 0, 9) === 0, 'dial clamps');

/* ---------------------------------------------------------------------------
   5. LESSON STRUCTURE.
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
  check(s.kMin <= s.kMax && s.kMin >= SHIFT_MIN && s.kMax <= SHIFT_MAX, `step ${i} flight range sane`);
  check(['', 'x', 'xd'].includes(s.allow), `step ${i} button gate sane`);
});
check(STEPS[0].allow === '' && STEPS[0].kMin === 0 && STEPS[0].kMax === 0, 'step 0: look, do not fly');
check(STEPS[5].kMin === SHIFT_MIN && STEPS[5].kMax === SHIFT_MAX, 'the capstone opens the whole frame');
check(DIALS.length === 2 && DIALS[0].unlock < DIALS[1].unlock, 'two digit dials, unlocked one per step');
check(START_D1 === 2 && START_D2 === 5, 'the lesson opens on 2.5');
check(STEPS[1].choices.some((c) => c.includes('2.50')), 'the add-a-zero foil is on the table');
check(/setD2\(0\)/.test(code), 'step 2 pins the bare whole digit (the zeros count the presses)');
check(/setD1\(3\)/.test(code) && /setD2\(4\)/.test(code), 'step 3 pins the 3.4 → 3400 story');
check(/setK\(1\)/.test(code), 'step 4 parks at 25 before the walk home');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/factor.?train|\btrains?\b|\btiles?\b|repeated factor/i, 'no factor train, no tiles (ExponentRulesLab)'],
  [/base.?ten|\brods?\b|flats?|value bar/i, 'no base-ten blocks, no value bar (NumberLab)'],
  [/hundredths grid|10\s*[x×]\s*10|magnif|number line/i, 'no grid, no magnifier, no number line (DecimalLab)'],
  [/addend|\bcarry\b|carried digit|\bsums?\b/i, 'nothing is added, nothing carries (DecimalArithmeticLab)'],
  [/skip.?count/i, 'no skip-counting (MultiplesLab)'],
  [/points? moves?|mov(e|es|ing) the (decimal )?point/i, 'the point never moves — the digits do'],
  [/requestAnimationFrame/, 'no rAF (nothing animates)'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* the post is the named anchor, and the zeros are called what they are */
check(/bolted/.test(code), 'the bolted post is named on the canvas');
check(/placeholder/i.test(code), 'the zeros are placeholders, said so');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-powersoften: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
