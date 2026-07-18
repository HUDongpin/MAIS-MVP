/* ============================================================================
   audit-extraneous.mjs — numeric proof for ExtraneousLab.jsx
   (HSA-REI.A.2 · the one-way gate; every intruder is the mirror's citizen).

   Run:  node audit-extraneous.mjs [path-to-jsx]
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PATH = process.argv[2] || fileURLToPath(new URL('./ExtraneousLab.jsx', import.meta.url));
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
const compAt = src.indexOf('export default function ExtraneousLab');
check(importAt > 0, 'react import found');
check(compAt > importAt, 'component found after model');

const headerEnd = src.indexOf('\n', importAt);
const modelSrc = src.slice(headerEnd, compAt);
const code = src.slice(headerEnd);
const cssAt = code.indexOf('<style jsx>');
const codeSansCss = cssAt > 0 ? code.slice(0, cssAt) : code;

const sandbox = new Function(
  `${modelSrc}
   return { CARMINE, BLUE, GOLD, CALIB_STEP, MINUS, fmtInt, sqrtInt, eqText,
            mirrorText, squaredCoefs, squaredText, rootsOf, statusOf, genuineOf,
            intruderOf, MAIN, DIAL_STOPS, CASES, GEN_CHIPS, INTR_CHIPS, labelOf,
            genTruth, intrTruth, makeCase, calibChecks, closeness, isCalibrated,
            STEPS };`
)();
const {
  CALIB_STEP, MINUS, fmtInt, sqrtInt, eqText, mirrorText, squaredCoefs, squaredText,
  rootsOf, statusOf, genuineOf, intruderOf, MAIN, DIAL_STOPS, CASES, GEN_CHIPS,
  INTR_CHIPS, labelOf, genTruth, intrTruth, makeCase, calibChecks, closeness,
  isCalibrated, STEPS,
} = sandbox;

/* ---------------------------------------------------------------------------
   2. THE GATE'S LAWS — proven case by case, from first principles.
   ------------------------------------------------------------------------- */
check(sqrtInt(0) === 0 && sqrtInt(1) === 1 && sqrtInt(16) === 4 && sqrtInt(25) === 5, 'the certifier certifies');
for (const n of [-1, 2, 3, 5, 15]) {
  let threw = false;
  try {
    sqrtInt(n);
  } catch {
    threw = true;
  }
  check(threw, `sqrtInt(${n}) refuses to float`);
}

for (const eq of CASES) {
  const roots = rootsOf(eq);
  /* the squared form really is the square of BOTH the equation and its mirror */
  for (const r of roots) {
    const [, b, k] = squaredCoefs(eq);
    check(r * r + b * r + k === 0, `case ${eqText(eq)}: ${r} solves the squared form`);
    /* forward: (x + c)² = x + p at each candidate, by direct expansion */
    check((r + eq.c) * (r + eq.c) === r + eq.p, `case ${eqText(eq)}: the square balances at ${r}`);
    /* every candidate is genuine or intruder, never neither */
    check(['genuine', 'intruder'].includes(statusOf(eq, r)), `case ${eqText(eq)}: ${r} is classified`);
  }
  /* exactly one of each — the engineered near-miss structure */
  check(genuineOf(eq).length === 1 && intruderOf(eq).length === 1, `case ${eqText(eq)}: one genuine, one intruder`);
  const g = genuineOf(eq)[0];
  const t = intruderOf(eq)[0];
  /* the genuine truly solves the ORIGINAL; the intruder truly does not */
  check(sqrtInt(g + eq.p) === g + eq.c, `case ${eqText(eq)}: genuine clears the checkpoint`);
  check(sqrtInt(t + eq.p) !== t + eq.c, `case ${eqText(eq)}: intruder fails the checkpoint`);
  /* the intruder is the mirror's honest citizen */
  check(sqrtInt(t + eq.p) === -(t + eq.c), `case ${eqText(eq)}: intruder solves the mirror`);
  /* and the genuine fails the mirror — they traded places completely */
  check(sqrtInt(g + eq.p) !== -(g + eq.c) || g + eq.c === 0, `case ${eqText(eq)}: genuine is not the mirror's`);
  /* the sign screen: the intruder's right side is negative, the genuine's is not */
  check(t + eq.c < 0, `case ${eqText(eq)}: the intruder's right side is negative`);
  check(g + eq.c >= 0, `case ${eqText(eq)}: the genuine's right side is not`);
}

/* the lesson's fixed equation is the first case */
check(MAIN.p === 7 && MAIN.c === -5, 'the lesson rides √(x+7) = x − 5');
check(rootsOf(MAIN).slice().sort((a, b) => a - b).join(',') === '2,9', 'candidates 2 and 9');
check(genuineOf(MAIN)[0] === 9 && intruderOf(MAIN)[0] === 2, '9 genuine, 2 extraneous');
check(squaredText(MAIN) === `x² ${MINUS} 11x + 18 = 0`, 'the squared form prints right');
check(9 + 2 === 11 && 9 * 2 === 18, 'Vieta agrees with the printed quadratic');
/* the dial stops keep every radicand a perfect square */
check(DIAL_STOPS.length >= 5, 'a real sweep');
for (const x of DIAL_STOPS) {
  const s = sqrtInt(x + MAIN.p);
  check(Number.isInteger(s), `stop ${x}: honest radicand`);
}
check(DIAL_STOPS.filter((x) => sqrtInt(x + MAIN.p) === x + MAIN.c).length === 1, 'the sweep agrees exactly once');
check(DIAL_STOPS.filter((x) => sqrtInt(x + MAIN.p) === -(x + MAIN.c)).length === 1, 'and mirrors exactly once');

/* ---------------------------------------------------------------------------
   3. QUOTED FACTS.
   ------------------------------------------------------------------------- */
check(/x² − 11x \+ 18 = 0/.test(STEPS[0].body), 'step 1 posts the squared form');
check(/√16 = 4/.test(STEPS[1].body) && /√9 = 3/.test(STEPS[1].body), 'step 2 posts both substitutions');
check(sqrtInt(16) === 4 && sqrtInt(9) === 3 && 9 - 5 === 4 && 2 - 5 === -3, 'and they are true');
check(/3 ≠ −3/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key shows the sign clash');
check(/√\(x \+ 7\) = −\(x − 5\)/.test(STEPS[2].body), 'step 3 posts the mirror');
check(/3² = \(−3\)²/.test(STEPS[0].feedback) || /\(x − 5\)² = \(−\(x − 5\)\)²/.test(STEPS[2].choices[STEPS[2].answer]), 'the sign-blindness is stated');
check(/roots bench/.test(STEPS[1].note), 'the extraction craft is credited');
check(/quadratic bench/.test(STEPS[0].body), 'the solving craft is credited');
check(/−6, −3, 2, 9, 18/.test(STEPS[4].body), 'step 5 posts the honest stops');

/* ---------------------------------------------------------------------------
   4. LESSON STRUCTURE.
   ------------------------------------------------------------------------- */
check(STEPS.length === 6, 'six steps');
check(!!STEPS[STEPS.length - 1].calib, 'last step is the calibration');
check(STEPS.filter((s) => s.calib).length === 1, 'exactly one calibration step');
check(CALIB_STEP === STEPS.length - 1, 'CALIB_STEP points at the last step');
STEPS.forEach((s, i) => {
  check(['derive', 'check', 'mirror', 'dial'].includes(s.mode), `step ${i} mode valid`);
  if (s.calib) return;
  check(typeof s.q === 'string' && s.q.length > 0, `step ${i} has a question`);
  check(Array.isArray(s.choices) && s.choices.length === 3, `step ${i} has three choices`);
  check(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.choices.length, `step ${i} answer valid`);
  check(typeof s.feedback === 'string' && s.feedback.length > 40, `step ${i} has a real reveal`);
});
check(STEPS[0].mode === 'derive' && STEPS[2].mode === 'mirror' && STEPS[4].mode === 'dial' && !!STEPS[4].dial, 'the scene ladder');
/* answer keys */
check(/^No — a = b forces a² = b²/.test(STEPS[0].choices[STEPS[0].answer]), 'step 1 key: one-way');
check(/^9 clears — 4 = 4/.test(STEPS[1].choices[STEPS[1].answer]), 'step 2 key: the checkpoint verdict');
check(/^Because \(x − 5\)² = \(−\(x − 5\)\)²/.test(STEPS[2].choices[STEPS[2].answer]), 'step 3 key: shared shadow');
check(/^It cannot solve the original/.test(STEPS[3].choices[STEPS[3].answer]), 'step 4 key: the sign screen');
check(/^One — only x = 9/.test(STEPS[4].choices[STEPS[4].answer]), 'step 5 key: one agreement');
check(/every algebra step can be undone/.test(STEPS[0].choices.join('|')), 'the reversibility belief is offered');
check(/Both clear/.test(STEPS[1].choices.join('|')), 'the both-count belief is offered');

/* ---------------------------------------------------------------------------
   5. CALIBRATION.
   ------------------------------------------------------------------------- */
check(CASES.length >= 6, 'several posted equations');
const gensPosted = new Set(CASES.map((_, i) => genTruth(i)));
const intrsPosted = new Set(CASES.map((_, i) => intrTruth(i)));
check(GEN_CHIPS.every((g) => gensPosted.has(g)), 'every genuine chip is some case’s truth');
check(INTR_CHIPS.every((t) => intrsPosted.has(t)), 'every intruder chip is some case’s truth');
/* a value that is genuine somewhere and intruder elsewhere — the deep near-miss */
check(
  CASES.some((_, i) => CASES.some((_, j) => i !== j && genTruth(i) === intrTruth(j))),
  'some value is genuine in one case and the intruder in another'
);
for (let i = 0; i < CASES.length; i++) {
  const gT = genTruth(i);
  const tT = intrTruth(i);
  check(GEN_CHIPS.includes(gT) && INTR_CHIPS.includes(tT), `case ${i}: truths are chips`);
  check(gT !== tT, `case ${i}: the two rulings differ`);
  for (const gp of [null, ...GEN_CHIPS, 'bogus']) {
    for (const ip of [null, ...INTR_CHIPS]) {
      const should = gp === gT && ip === tT;
      check(isCalibrated(i, gp, ip) === should, `gate: case ${i} g=${gp} i=${ip}`);
      check([0, 50, 100].includes(closeness(i, gp, ip)), 'meter quantized');
    }
  }
  const wrongG = GEN_CHIPS.find((x) => x !== gT);
  check(closeness(i, wrongG, tT) === 0, `case ${i}: the intruder without the genuine earns nothing`);
  check(labelOf(i) === eqText(CASES[i]), `case ${i}: label posts the equation`);
}
check(calibChecks(null, '9', '2').every((x) => x === false), 'no case, no credit');
for (let i = 0; i < 200; i++) {
  const k = makeCase(null);
  check(Number.isInteger(k) && k >= 0 && k < CASES.length, 'cases from the space');
}
for (let i = 0; i < 100; i++) check(makeCase(2) !== 2, 'a new case is genuinely new');

/* ---------------------------------------------------------------------------
   6. REFUSALS & RESTRAINT — grep the CODE (styled-jsx stripped).
   ------------------------------------------------------------------------- */
const forbid = [
  [/\bgraphs?\b|\bcurves?\b|parabola|intersect/i, 'no function pictures — substitution only'],
  [/quadratic formula|discriminant|completing the square/i, 'no solving machinery (the quadratic bench is credited)'],
  [/\bscale\b|\bbalance|two-pan/i, 'no balance imagery (EquationLab)'],
  [/\bcourts?\b|\bverdicts?\b|convict|docket|on trial/i, 'no court (RationalExponentLab owns the forcing court)'],
  [/area-to-side|\bbracket\b/i, 'no extraction machinery (RootsLab)'],
  [/degree-slot|\bledger\b|deposit/i, 'no slot machinery (PolynomialArithmeticLab)'],
  [/census|constraint kit/i, 'no kit machinery (TriangleBuildLab)'],
  [/\btags?\b|\bcoins?\b/i, 'no sibling currency'],
  [/odometer|brigade|\bslats?\b|\btrap\b/i, 'no slats or traps (IntegralLab)'],
  [/\bwalkers?\b|foothold/i, 'no walkers (LimitLab)'],
  [/mason|\bleftover\b|\bmarch/i, 'no sibling machinery'],
  [/Math\.(sqrt|pow|cbrt|log|exp)/, 'roots by bounded integer search only'],
  [/\*\*/, 'no exponent operator'],
  [/requestAnimationFrame/, 'nothing animates'],
];
for (const [re, why] of forbid) check(!re.test(codeSansCss), `REFUSAL violated: ${why}`);

/* verdicts must be DERIVED, never stored */
check(/const statusOf = \(eq, r\) => \{/.test(code), 'the checkpoint classifies live');
check(/const rootsOf = \(eq\) => \{/.test(code), 'candidates are searched, not stored');
{
  const blockStart = code.indexOf('const CASES = [');
  const blockEnd = code.indexOf('];', blockStart);
  const block = code.slice(blockStart, blockEnd);
  check(!/genuine|intruder|roots|truth|answer/i.test(block), 'no case ships its own checkpoint results');
}
/* the drawing reads the model */
check(/sqrtInt\(r \+ S\.eq\.p\)/.test(code), 'the checkpoint table computes live');
check(/mirrorText\(S\.eq\)/.test(code), 'the mirror card prints through the model');
check(/statusOf|genuineOf\(S\.eq\)/.test(code), 'the verdict rows read the model');

/* ---------------------------------------------------------------------------
   verdict
   ------------------------------------------------------------------------- */
console.log(`audit-extraneous: ${pass} checks pass, ${fail} fail`);
if (fail) {
  console.log(bad.map((b) => '  ✗ ' + b).join('\n'));
  process.exit(1);
}
