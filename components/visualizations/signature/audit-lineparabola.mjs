/* ============================================================================
   audit-lineparabola.mjs — numeric proof for LineParabolaLab.jsx
   (HSA-REI.C.7 · the gap gauge; the floor is the verdict).

   Run:  node audit-lineparabola.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./LineParabolaLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function LineParabolaLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, lineText, gapAt,
            floorOf, stationOf, countOf, meetingsOf, SCENES, CASES, COUNT_CHIPS,
            FLOOR_CHIPS, labelOf, countTruth, floorTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtInt, lineText, gapAt, floorOf, stationOf, countOf,
  meetingsOf, SCENES, CASES, COUNT_CHIPS, FLOOR_CHIPS, labelOf, countTruth,
  floorTruth, makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE GAUGE'S LAWS — floor and count against independent arguments.
   ------------------------------------------------------------------------- */
/* the floor really is the minimum: d(h) ≤ d(x) for every x in a wide sweep */
for (const m of [0, 2, 4, -2]) {
  for (let b = -6; b <= 6; b++) {
    const f = floorOf(m, b);
    const h = stationOf(m);
    check(gapAt(m, b, h) === f, `floor(${m},${b}) is the reading at the station`);
    for (let x = -12; x <= 12; x++) check(gapAt(m, b, x) >= f, `floor(${m},${b}) is a true minimum at x=${x}`);
    /* completing the check by identity: d(x) − f = (x − h)², expanded exactly */
    for (let x = -6; x <= 6; x++) check(gapAt(m, b, x) - f === (x - h) * (x - h), `the gap sits on a shifted square (${m},${b},${x})`);
    /* the count law, verified two independent ways */
    const meets = meetingsOf(m, b);
    if (f < 0) {
      check(countOf(m, b) === 2, `floor<0 → 2 (${m},${b})`);
      /* the gap changes sign, so it must cross twice: check sign change on both sides */
      check(gapAt(m, b, h - 6) > 0 && gapAt(m, b, h + 6) > 0 && gapAt(m, b, h) < 0, `sign pattern (${m},${b})`);
    } else if (f === 0) {
      check(countOf(m, b) === 1 && meets.length === 1 && meets[0] === h, `floor=0 → the kiss at the station (${m},${b})`);
    } else {
      check(countOf(m, b) === 0 && meets.length === 0, `floor>0 → no meetings anywhere (${m},${b})`);
    }
    /* when the floor is −k², the meetings are integers h ± k — search agrees */
    if (f < 0) {
      const k2 = -f;
      const k = Math.floor(Math.sqrt(k2) + 0.5);
      if (k * k === k2) check(meets.join(',') === `${h - k},${h + k}`, `integer meetings at h ± k (${m},${b})`);
    }
  }
}
/* odd slopes are refused — the floor would leave the integers */
{
  let threw = false;
  try {
    floorOf(1, 0);
  } catch {
    threw = true;
  }
  check(threw, 'odd slopes refuse');
}
/* the worked scenes */
check(meetingsOf(2, 3).join(',') === '-1,3', 'y = 2x + 3 meets at −1 and 3');
check(gapAt(2, 3, -1) === 0 && gapAt(2, 3, 3) === 0 && 1 === 1 * 1 && 9 === 3 * 3, 'the shared points (−1,1) and (3,9) check in both rules');
check(floorOf(2, 3) === -4 && 1 - 2 - 3 === -4, 'the cross floor: −4 at x = 1');
check(floorOf(2, -1) === 0 && meetingsOf(2, -1).join(',') === '1', 'the kiss: floor 0 at x = 1');
check(floorOf(2, -5) === 4 && 1 - 2 + 5 === 4, 'the miss: floor 4, the closest approach');
/* the dial law: floor(b) = −1 − b for m = 2 */
for (let b = -5; b <= 3; b++) {
  check(floorOf(2, b) === -1 - b, `dial: floor = −1 − b at b=${b}`);
  check(countOf(2, b) === (b < -1 ? 0 : b === -1 ? 1 : 2), `dial: count law at b=${b}`);
}
/* the classical bridge: floor × (−4) = m² + 4b */
for (const { m, b } of CASES) check(-4 * floorOf(m, b) === m * m + 4 * b, `the −4·floor bridge (${m},${b})`);

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/\(−1, 1\)/.test(STEPS[0].feedback) && /\(3, 9\)/.test(STEPS[0].feedback), 'step 1 posts both meetings');
check(/d\(1\) = 1 − 2 − 3 = −4/.test(STEPS[1].note), 'step 2 reads the floor by hand');
check(/\(x − 1\)²/.test(STEPS[2].body), 'step 3 shows the square');
check(/1 − 2 \+ 5 = 4/.test(STEPS[3].body), 'step 4 computes the miss floor');
check(/−1 − b/.test(STEPS[4].body), 'step 5 posts the dial law');
check(/quadratic bench/.test(STEPS[1].feedback), 'the solving craft is credited');
check(/linear-systems bench/.test(STEPS[0].note), 'the prequel is credited');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(!!SCENES[s.scene], `step ${i} scene exists`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].scene === 'cross' && STEPS[2].scene === 'kiss' && STEPS[3].scene === 'miss' && !!STEPS[4].dial, 'the scene ladder');
/* answer keys */
check(/^An x where both rules agree/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: the shared point');
check(/^The curves meet exactly where the gap reads 0/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the gap move');
check(/^Exactly one — the gap touches 0 at x = 1/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: the kiss');
check(/^No meetings — and 4 is the closest vertical approach/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the measured miss');
check(/^Only at b = −1/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the knife edge');
check(/Two, very close together/.test(STEPS[2].choices.join('|')), 'the tangent-as-two belief is offered');
check(/off the page/.test(STEPS[3].choices.join('|')), 'the meetings-elsewhere belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted lines');
const countsPosted = new Set(CASES.map((_, i) => countTruth(i)));
const floorsPosted = new Set(CASES.map((_, i) => floorTruth(i)));
check(COUNT_CHIPS.every((c) => countsPosted.has(c)), 'every count chip is some case’s truth');
check(FLOOR_CHIPS.every((f) => floorsPosted.has(f)), 'every floor chip is some case’s truth');
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && countTruth(i) === countTruth(j) && floorTruth(i) !== floorTruth(j))),
  'two cases share a count but not a floor'
);
for (let i = 0; i < CASES.length; i++) {
  const cT = countTruth(i);
  const fT = floorTruth(i);
  check(COUNT_CHIPS.includes(cT) && FLOOR_CHIPS.includes(fT), `case ${i}: truths are chips`);
  /* first principles: the floor by direct substitution at the station */
  const { m, b } = CASES[i];
  const h = m / 2;
  check(fT === fmtInt(h * h - m * h - b), `case ${i}: floor from substitution`);
  /* and the count from the floor's sign, independently restated */
  const f = h * h - m * h - b;
  check(cT === String(f < 0 ? 2 : f === 0 ? 1 : 0), `case ${i}: count from the sign`);
  for (const cp of [null, ...COUNT_CHIPS, 'bogus']) {
    for (const fp of [null, ...FLOOR_CHIPS]) {
      const should = cp === cT && fp === fT;
      check(isCalibrated(i, cp, fp) === should, `gate: case ${i} c=${cp} f=${fp}`);
      check([0, 50, 100].includes(closeness(i, cp, fp)), 'meter quantized');
    }
  }
  const wrongC = COUNT_CHIPS.find((x) => x !== cT);
  check(closeness(i, wrongC, fT) === 0, `case ${i}: the floor without the count earns nothing`);
  check(labelOf(i) === lineText(m, b), `case ${i}: label posts the line`);
}
check(calibChecks(null, '2', '0').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/vertex form|\btransform|\bstretch|\bshifts?\b/i, 'the parabola never shape-shifts (QuadraticFunctionLab)'],
  [/discriminant|quadratic formula|completing the square/i, 'the named number stays home (QuadraticEquationLab)'],
  [/\belimination\b|substitution method/i, 'no linear–linear machinery (SystemsOfEquationsLab)'],
  [/one-way gate|checkpoint|\bmirror\b|intruder/i, 'no gate machinery (ExtraneousLab)'],
  [/degree-slot|\bledger\b|deposit/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/\bfolds?\b|carry/i, 'no fold machinery (RemainderTheoremLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp)/, 'all model arithmetic is integer'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const countOf = \(m, b\) => \{/.test(code), 'the count is classified live');
check(/const floorOf = \(m, b\) => \{/.test(code), 'the floor is computed at the station');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/count|floor|truth|answer|meet/i.test(block), 'no case ships its own gauge readings');
}
/* the drawing reads the model */
check(/stationOf\(S\.m\)/.test(code), 'the gauge is drawn at the model’s station');
check(/S\.meets/.test(code), 'the meeting dots read the model');
check(/fmtInt\(S\.floor\)/.test(code), 'the floor label reads the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-lineparabola: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
