/* ============================================================================
   audit-scaledrawing.mjs — numeric + structural proof for ScaleDrawingLab.jsx
   (7.G.A.1 · the blueprint's two rulers; every length × k; areas × k²).

   Run:  node audit-scaledrawing.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ScaleDrawingLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ScaleDrawingLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, SCALES, ROOM, CALIB_STEP, paperOf, worldOf, paperArea,
            worldArea, areaFactor, CASES, makeCase, caseText, worldTruth, worldChips,
            factorTruth, factorChips, calibChecks, closeness, isCalibrated, STEPS };`
)();
const {
  SCALES, ROOM, CALIB_STEP, paperOf, worldOf, paperArea, worldArea, areaFactor, CASES,
  makeCase, caseText, worldTruth, worldChips, factorTruth, factorChips, calibChecks,
  closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TWO-RULER LAWS — integers, round trips, and the area law.
   ------------------------------------------------------------------------- */
check(ROOM.w === 6 && ROOM.h === 4, 'the room is 6 m × 4 m, fixed');
check(SCALES.join(',') === '50,100,200', 'the three dial stops');
for (const k of SCALES) {
  const pw = paperOf(ROOM.w, k);
  const ph = paperOf(ROOM.h, k);
  check(Number.isInteger(pw) && Number.isInteger(ph), `1:${k}: integer paper lengths`);
  /* the round trip: paper × k returns the world */
  check(worldOf(pw, k) === ROOM.w && worldOf(ph, k) === ROOM.h, `1:${k}: the round trip closes`);
  /* the area law: paper cm² × k² = world m² × 10⁴ cm²/m² */
  check(paperArea(k) * areaFactor(k) === worldArea() * 10000, `1:${k}: paperArea × k² = worldArea in cm²`);
}
check(paperOf(6, 50) === 12 && paperOf(6, 100) === 6 && paperOf(6, 200) === 3, 'the long wall: 12, 6, 3 cm');
check(paperOf(4, 50) === 8, 'the short wall at 1:50: 8 cm');
check(paperArea(100) === 24 && worldArea() === 24, 'the same-digits coincidence at 1:100');
check(areaFactor(100) === 10000, 'the 1:100 area factor is 10⁴');
/* both directions: entering the page divides */
check(paperOf(5, 50) === 10, 'the 5 m bookshelf draws as 10 cm at 1:50');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS — every number in the lesson copy, recomputed.
   ------------------------------------------------------------------------- */
check(worldOf(8, 50) === 4, '8 cm at 1:50 is 4 m');
check(/12 cm × 50 = 600 cm/.test(STEPS[0].body), 'step 1 quotes the conversion');
check(/6 cm; at 1:200, as 3 cm/.test(STEPS[2].body), 'step 3 quotes the shrinking wall');
check(/24 cm²/.test(STEPS[3].body) && /24 m²/.test(STEPS[3].body), 'step 4 posts the coincidence');
check(/240000 cm²/.test(STEPS[3].feedback), 'step 4 reconciles the units');
check(/500 cm ÷ 50/.test(STEPS[4].choices[0]) || /500 cm ÷\s*50/.test(STEPS[4].choices[0]), 'step 5 divides to enter the page');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE — scenes pinned; answer keys tied to the model.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(SCALES.includes(s.k), `step ${i} scale valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(!STEPS[0].dial && !!STEPS[2].dial, 'the dial unlocks at step 3');
/* answer keys derived from the model */
check(/^4 m — 8 cm × 50 = 400 cm/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the conversion');
check(/^Every world length is its paper length × 50/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the promise');
check(/^6 cm — a bigger k shrinks the paper/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the world holds still');
check(/^× 100² = 10000/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the k² law');
check(/^10 cm — 500 cm ÷ 50/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: entering divides');
/* the real beliefs are offered and refuted */
check(/paper numbers are world numbers/.test(STEPS[0].choices.join('|')), 'the same-number belief is offered');
check(/angles ×50/.test(STEPS[1].choices.join('|')), 'the angles-scale belief is offered');
check(/× 100 — same as the lengths/.test(STEPS[3].choices.join('|')), 'the linear-area belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION — both exact rulings; the stamp cannot fire falsely.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted walls');
check(new Set(CASES.map((c) => c.k)).size === SCALES.length, 'every scale appears in the cases');
for (let i = 0; i < CASES.length; i++) {
  const { cm, k } = CASES[i];
  check(Number.isInteger(worldOf(cm, k)), `case ${i}: integer world length by engineering`);
  const wChips = worldChips(i);
  const aChips = factorChips(i);
  const wT = worldTruth(i);
  const aT = factorTruth(i);
  check(wChips.length === 4 && new Set(wChips).size === 4, `case ${i}: four distinct length chips`);
  check(aChips.length === 4 && new Set(aChips).size === 4, `case ${i}: four distinct factor chips`);
  check(wChips.includes(wT), `case ${i}: the length truth is on a chip`);
  check(aChips.includes(aT), `case ${i}: the factor truth is on a chip`);
  check(wT === `${(cm * k) / 100} m`, `case ${i}: length truth from first principles`);
  check(aT === `× ${k * k}`, `case ${i}: factor truth is k²`);
  for (const wp of [null, ...wChips, 'bogus']) {
    for (const ap of [null, ...aChips]) {
      const should = wp === wT && ap === aT;
      check(isCalibrated(i, wp, ap) === should, `gate: case ${i} w=${wp} a=${ap}`);
      check([0, 50, 100].includes(closeness(i, wp, ap)), 'meter quantized');
    }
  }
  const wrongW = wChips.find((x) => x !== wT);
  check(closeness(i, wrongW, aT) === 0, `case ${i}: the factor without the length earns nothing`);
}
check(calibChecks(null, '3 m', '× 2500').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const kk = makeCase(null);
  check(Number.isInteger(kk) && kk >= 0 && kk < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(4) !== 4, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (below the header comment).
   ------------------------------------------------------------------------- */
const forbid = [
  [/scale factor/i, 'the document has a SCALE, 1:k — no scale-factor language (DilationsLab)'],
  [/center of dilation|\bdilat/i, 'nothing dilates from a point (DilationsLab)'],
  [/conversion rate|unit rate/i, 'no rate machinery (UnitConversionLab)'],
  [/hypotenuse|\bdiagonals?\b/i, 'no diagonal is computed (TrigRatioLab)'],
  [/cut-and-slide|cut and slide/i, 'no dissection (AreaLab)'],
  [/\bcoins?\b|\btags?\b/i, 'no sibling currency (FractionDivisionLab / PercentChangeLab)'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|packing|leftover|\bmarch/i, 'no sibling machinery'],
  [/Math\.sqrt/, 'nothing is square-rooted'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(code), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const paperOf = \(meters, k\) => \(meters \* 100\) \/ k/.test(code), 'the paper ruler is the law');
check(/const worldOf = \(cm, k\) => \(cm \* k\) \/ 100/.test(code), 'the world ruler is the law');
check(/const areaFactor = \(k\) => k \* k/.test(code), 'the area factor is k², derived');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/world|answer|truth|factor:/i.test(block), 'no wall ships its own world length');
}
/* the drawing reads the model */
check(/paperOf\(ROOM\.w, S\.k\)/.test(code), 'the page reads the model');
check(/paperArea\(S\.k\)/.test(code), 'the area ledger reads the model');
check(/worldChips\(kase\)/.test(code) && /factorChips\(kase\)/.test(code), 'the stamp chips come from the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-scaledrawing: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
