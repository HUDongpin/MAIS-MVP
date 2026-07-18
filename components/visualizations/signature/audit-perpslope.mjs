/* ============================================================================
   audit-perpslope.mjs — numeric proof for PerpSlopeLab.jsx
   (HSG-GPE.B.5 · the quarter turn; m₁·m₂ = −1 as cancellation).

   Run:  node audit-perpslope.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./PerpSlopeLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function PerpSlopeLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, gcdOf, turn, slopeOf,
            perpSlopeOf, slopeText, handshake, STEP_SET, CASES, SLOPE_CHIPS,
            PERP_CHIPS, labelOf, slopeTruth, perpTruth, makeCase, calibChecks,
            closeness, isCalibrated, STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtInt, turn, slopeOf, perpSlopeOf, slopeText, handshake,
  STEP_SET, CASES, SLOPE_CHIPS, PERP_CHIPS, labelOf, slopeTruth, perpTruth,
  makeCase, calibChecks, closeness, isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE TURN'S LAWS — over the whole integer grid.
   ------------------------------------------------------------------------- */
for (let a = -8; a <= 8; a++)
  for (let b = -8; b <= 8; b++) {
    if (a === 0 && b === 0) continue;
    const t = turn([a, b]);
    /* the turn law itself */
    check(t[0] === -b && t[1] === a, `turn(${a},${b}) = (−b, a)`);
    /* the handshake is ALWAYS zero between a step and its turn */
    check(handshake([a, b], t) === 0, `handshake zero (${a},${b})`);
    /* four turns come home; two turns reverse */
    const t4 = turn(turn(turn(turn([a, b]))));
    check(t4[0] === a && t4[1] === b, `four turns are the identity (${a},${b})`);
    const t2 = turn(turn([a, b]));
    check(t2[0] === -a && t2[1] === -b, `two turns reverse (${a},${b})`);
    /* the turn preserves the tile: |a|,|b| multiset unchanged */
    check(
      Math.abs(t[0]) * Math.abs(t[1]) === Math.abs(a) * Math.abs(b),
      `the tile survives the turn (${a},${b})`
    );
    /* the product law, wherever both slopes exist */
    if (a !== 0 && b !== 0) {
      const [n1, d1] = slopeOf([a, b]);
      const [n2, d2] = slopeOf(t);
      check(n1 * n2 === -(d1 * d2), `m₁·m₂ = −1 at (${a},${b})`);
    }
    /* float cross-check: the two directions really meet at 90° */
    if (!(a === 0 || b === 0)) {
      const dot = a * t[0] + b * t[1];
      const cosAng = dot / (Math.hypot(a, b) * Math.hypot(...t));
      check(Math.abs(cosAng) < 1e-12, `float angle is right (${a},${b})`);
    }
  }
/* vertical steps refuse a slope */
{
  let threw = false;
  try {
    slopeOf([0, 3]);
  } catch {
    threw = true;
  }
  check(threw, 'the vertical step throws');
}
/* the blind-spot pair: flat turns to vertical; handshake still zero */
check(turn([1, 0])[0] === 0 && turn([1, 0])[1] === 1, '(1,0) turns to (0,1)');
check(handshake([1, 0], [0, 1]) === 0, 'the silent pair still shakes to zero');
{
  /* the flat step's perpendicular is vertical — its slope must refuse too */
  let threw = false;
  try {
    perpSlopeOf([1, 0]);
  } catch {
    threw = true;
  }
  check(threw, 'the flat step’s perpendicular slope refuses (vertical)');
  /* while the vertical step's perpendicular is flat: slope exactly 0 */
  check(slopeText(perpSlopeOf([0, 1])) === '0', 'the vertical step’s perpendicular is flat, slope 0');
}
/* reductions quoted in step 1 and 4 */
check(slopeText(slopeOf([6, 4])) === '2/3' && slopeText(slopeOf([9, 6])) === '2/3', 'scaling never moves the slope');
check(slopeText(slopeOf([3, 2])) === '2/3' && slopeText(perpSlopeOf([3, 2])) === `${MINUS}3/2`, 'the worked pair');
check(2 * -3 === -(3 * 2), '(2/3)·(−3/2) = −1 by cross products');
check(3 * -2 + 2 * 3 === 0, 'the quoted handshake 3·(−2) + 2·3 = 0');
/* the mirror-tilt foil from step 4: product +1 is neither parallel nor perpendicular */
check(2 * 3 === 3 * 2 && handshake([3, 2], [2, 3]) !== 0, 'slopes 2/3 and 3/2: product +1, NOT perpendicular');
check(STEP_SET.length >= 5 && STEP_SET[4][1] === 0, 'the dial ends on the flat step');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/4\/6 reduces to 2\/3/.test(STEPS[0].body), 'step 1 reduces the scaled step');
check(/3·\(−2\) \+ 2·3 = 0/.test(STEPS[1].feedback), 'step 2 runs the handshake');
check(/3\/\(−2\) = −3\/2/.test(STEPS[2].body), 'step 3 reads the turned slope');
check(/−\(ab\)\/\(ab\) = −1/.test(STEPS[2].feedback), 'step 3 shows the cancellation');
check(/line bench/.test(STEPS[0].feedback), 'the slope triangle is credited');
check(/2\/3 and 3\/2/.test(STEPS[3].note), 'the +1 foil is named');
check(/1·0 \+ 0·1/.test(STEPS[4].feedback.replace(/\s+/g, ' ')), 'step 5 shakes the silent pair');

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
check(!STEPS[0].showTurn && STEPS[1].showTurn && !!STEPS[4].dial, 'the turn enters at step 2; the dial at step 5');
/* answer keys */
check(/^The step’s shape/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: shape not size');
check(/^Same tile, stood on its side/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the tile');
check(/^−1 exactly/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: cancellation');
check(/^Equal slopes/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: parallel');
check(/^Perpendicular by the turn test/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: the silent rule');
check(/About −0\.9/.test(STEPS[2].choices.join('|')), 'the approximation belief is offered');
check(/multiply to \+1/.test(STEPS[3].choices.join('|')), 'the +1 foil is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted steps');
const slopesPosted = new Set(CASES.map((_, i) => slopeTruth(i)));
const perpsPosted = new Set(CASES.map((_, i) => perpTruth(i)));
check(SLOPE_CHIPS.every((s) => slopesPosted.has(s)), 'every slope chip is some case’s truth');
check(PERP_CHIPS.every((p) => perpsPosted.has(p)), 'every perpendicular chip is some case’s truth');
for (let i = 0; i < CASES.length; i++) {
  const sT = slopeTruth(i);
  const pT = perpTruth(i);
  check(SLOPE_CHIPS.includes(sT) && PERP_CHIPS.includes(pT), `case ${i}: truths are chips`);
  const [a, b] = CASES[i];
  /* first principles: reduced b/a and reduced −a/b */
  const g1 = ((x, y) => {
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  })(b, a);
  check(sT === (a / g1 === 1 ? String(b / g1) : `${b / g1}/${a / g1}`), `case ${i}: slope from first principles`);
  /* the perpendicular is the negative reciprocal, cross-checked */
  const [pn, pd] = perpSlopeOf(CASES[i]);
  check(pn * b === -(pd * a) || pn * b === -pd * a, `case ${i}: perp is the negative reciprocal`);
  check(pn < 0, `case ${i}: the perpendicular slope is negative for a rising step`);
  for (const sp of [null, ...SLOPE_CHIPS, 'bogus']) {
    for (const pp of [null, ...PERP_CHIPS]) {
      const should = sp === sT && pp === pT;
      check(isCalibrated(i, sp, pp) === should, `gate: case ${i} s=${sp} p=${pp}`);
      check([0, 50, 100].includes(closeness(i, sp, pp)), 'meter quantized');
    }
  }
  const wrongS = SLOPE_CHIPS.find((x) => x !== sT);
  check(closeness(i, wrongS, pT) === 0, `case ${i}: the turn without the slope earns nothing`);
  check(labelOf(i).includes(String(CASES[i][0])), `case ${i}: label posts the run`);
}
check(calibChecks(null, '2/3', `${MINUS}3/2`).every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bintercepts?\b|staircase|y = mx/i, 'no line anatomy (LineFunctionLab)'],
  [/\bimaginary\b|complex plane|×i/i, 'no multiplication-as-turning (ComplexPlaneLab)'],
  [/\bdeficit\b|audit card/i, 'no audit machinery (TriangleSolveLab)'],
  [/dot product|projection|magnitude/i, 'no named vector machinery (a later bench)'],
  [/\blathe\b|revolve/i, 'no revolution machinery (a later bench)'],
  [/jurisdiction|\bdeed\b|territory/i, 'no map machinery (PiecewiseLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp|acos|asin)/, 'no float roots or powers anywhere'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);
/* Math.atan2/cos/hypot may appear ONLY for arrowheads in the renderer */
check(!/Math\./.test(modelSrc.replace(/Math\.(abs|floor|random)/g, '')), 'the model uses only abs, floor, random (case-picking)');
check(!/Math\.(cos|sin|atan)/.test(modelSrc), 'no float trig in the model — arrowheads live in the renderer');

/* verdicts must be DERIVED, never stored */
check(/const perpSlopeOf = \(step\) => slopeOf\(turn\(step\)\)/.test(code), 'the perpendicular rides the turn');
check(/const turn = \(\[a, b\]\) => \[-b, a\]/.test(code), 'one turn law');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/slope|perp|truth|answer/i.test(block), 'no case ships its own slopes');
}
/* the drawing reads the model */
check(/arrow\(S\.vec, BLUE\)/.test(code), 'the step arrow reads the model');
check(/arrow\(S\.turned, CARMINE\)/.test(code), 'the turned arrow reads the model');
check(/handshake\(S\.vec, S\.turned\)/.test(code), 'the receipt is computed live');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-perpslope: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
